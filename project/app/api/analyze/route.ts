import sharp from 'sharp';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mockResult } from '../../../lib/mock';
import inventoryConfig from '../../../config/tool_inventory.json';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB || 7) * 1024 * 1024;
const MODEL_TIMEOUT_MS = Number(process.env.VISION_MODEL_TIMEOUT_MS || 90000);
const YOLO_TIMEOUT_MS = 30000;
const REAL_SLOT_TIMEOUT_MS = 30000;
const fail = (code: string, message: string, status = 400) =>
  Response.json({ error: { code, message } }, { status });

function projectRoot() {
  const cwd = process.cwd();
  return process.env.YOLO_PROJECT_ROOT || (/[\\/]\.next[\\/]standalone$/i.test(cwd) ? cwd.replace(/[\\/]\.next[\\/]standalone$/i, '') : cwd);
}

function runPythonJson<T>(script: string, image: Buffer, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const root = projectRoot();
    const python = process.env.YOLO_PYTHON || `${root}/.venv-yolo/Scripts/python.exe`;
    const child = spawn(python, [`${root}/scripts/${script}`], { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`PYTHON_INFERENCE_FAILED: ${stderr.slice(-1000) || `exit ${code}`}`));
      try { resolve(JSON.parse(stdout.trim()) as T); } catch { reject(new Error('PYTHON_INVALID_RESPONSE')); }
    });
    child.stdin.end(JSON.stringify({ imageHex: image.toString('hex') }));
  });
}

type YoloResult = { emptySlots: { bbox: [number, number, number, number]; confidence: number }[] };

type YoloPending = { resolve: (result: YoloResult) => void; reject: (error: Error) => void; timer: NodeJS.Timeout };

let yoloProcess: ChildProcessWithoutNullStreams | undefined;
let yoloStart: Promise<void> | undefined;
let yoloBuffer = '';
let yoloRequestId = 0;
const yoloPending = new Map<number, YoloPending>();

function yoloRoot() {
  return projectRoot();
}

function rejectYoloPending(error: Error) {
  for (const pending of yoloPending.values()) {
    clearTimeout(pending.timer);
    pending.reject(error);
  }
  yoloPending.clear();
}

function handleYoloLine(line: string, ready: () => void) {
  if (!line.trim()) return;
  try {
    const message = JSON.parse(line);
    if (message.ready) {
      ready();
      return;
    }
    if (typeof message.id !== 'number') return;
    const pending = yoloPending.get(message.id);
    if (!pending) return;
    yoloPending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) pending.reject(new Error(message.error));
    else pending.resolve(message.result as YoloResult);
  } catch {
    // Keep protocol noise out of the request response. The worker's stderr is the diagnostic channel.
  }
}

function ensureYoloWorker() {
  if (yoloStart) return yoloStart;
  yoloStart = new Promise<void>((resolve, reject) => {
    const root = yoloRoot();
    const python = process.env.YOLO_PYTHON || `${root}/.venv-yolo/Scripts/python.exe`;
    const child = spawn(python, [`${root}/scripts/yolo_worker.py`], { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    yoloProcess = child;
    let started = false;
    let stderr = '';
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      yoloBuffer += chunk;
      const lines = yoloBuffer.split(/\r?\n/);
      yoloBuffer = lines.pop() || '';
      for (const line of lines) handleYoloLine(line, () => { started = true; resolve(); });
    });
    child.on('error', (error) => {
      rejectYoloPending(error instanceof Error ? error : new Error(String(error)));
      if (!started) reject(error);
    });
    child.on('close', (code) => {
      yoloProcess = undefined;
      yoloStart = undefined;
      yoloBuffer = '';
      const error = new Error(`YOLO_WORKER_EXIT_${code}: ${stderr.slice(-500)}`);
      rejectYoloPending(error);
      if (!started) reject(error);
    });
  });
  return yoloStart;
}

function runYolo(image: Buffer): Promise<YoloResult> {
  return ensureYoloWorker().then(() => new Promise((resolve, reject) => {
    if (!yoloProcess?.stdin.writable) return reject(new Error('YOLO_WORKER_UNAVAILABLE'));
    const id = ++yoloRequestId;
    const timer = setTimeout(() => {
      yoloPending.delete(id);
      reject(new Error('YOLO_WORKER_TIMEOUT'));
    }, YOLO_TIMEOUT_MS);
    yoloPending.set(id, { resolve, reject, timer });
    yoloProcess.stdin.write(JSON.stringify({ id, imageHex: image.toString('hex') }) + '\n', (error) => {
      if (!error) return;
      const pending = yoloPending.get(id);
      if (!pending) return;
      yoloPending.delete(id);
      clearTimeout(pending.timer);
      pending.reject(error);
    });
  }));
}

void ensureYoloWorker().catch(() => undefined);

type RealSlotResult = {
  status: string;
  referenceId?: number;
  registrationInliers?: number;
  image?: { width: number; height: number };
  missingSlots: { slot: string; classId: string; label: string; ratio: number; confidence: number; bbox: [number, number, number, number] }[];
};

function runRealSlots(image: Buffer): Promise<RealSlotResult> {
  return runPythonJson('infer_real_slots.py', image, REAL_SLOT_TIMEOUT_MS);
}

function configured() {
  return Boolean(
    process.env.VISION_MODEL_BASE_URL &&
      process.env.VISION_MODEL_API_KEY &&
      process.env.VISION_MODEL_NAME,
  );
}

function extractContent(body: any): string {
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('');
  }
  throw new Error('MODEL_EMPTY_RESPONSE');
}

function parseModelJson(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('MODEL_INVALID_JSON');
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function bbox(value: unknown): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 4 || value.some((n) => typeof n !== 'number' || !Number.isFinite(n))) return null;
  const values = value.map((n) => Math.max(0, Math.min(1000, n))) as [number, number, number, number];
  return values[2] > values[0] && values[3] > values[1] ? values : null;
}

function confidence(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : undefined;
}

function normalizeModelResult(raw: any, requestId: string, width: number, height: number, inventory: any[]) {
  if (!raw || !Array.isArray(raw.items)) throw new Error('MODEL_INVALID_RESULT');
  const items = new Map<string, any>();
  for (const item of raw.items) {
    if (typeof item?.class_id !== 'string' || !Number.isFinite(item.count) || item.count < 0) continue;
    items.set(item.class_id, item);
  }
  const missing = new Map<string, any>();
  for (const item of Array.isArray(raw.missing_items) ? raw.missing_items : []) {
    if (typeof item?.class_id === 'string') missing.set(item.class_id, item);
  }
  const uncertain = new Set(
    (Array.isArray(raw.uncertain_items) ? raw.uncertain_items : [])
      .map((item: any) => item?.class_id)
      .filter((id: unknown): id is string => typeof id === 'string'),
  );
  const detections: any[] = [];
  const comparisons = inventory.map((standard: any) => {
    const item = items.get(standard.classId);
    const observed = item ? Math.min(standard.expectedCount + 100, Math.max(0, Math.round(item.count))) : 0;
    const missingCount = Math.max(0, standard.expectedCount - observed);
    const itemBox = bbox(item?.bbox_2d);
    const itemConfidence = confidence(item?.confidence);
    if (observed > 0 && itemBox) {
      detections.push({
        id: `model-${standard.classId}`,
        classId: standard.classId,
        label: standard.label,
        count: observed,
        bbox: { x1: itemBox[0], y1: itemBox[1], x2: itemBox[2], y2: itemBox[3] },
        confidence: itemConfidence,
        reviewRequired: Boolean(item?.review_required) || uncertain.has(standard.classId),
        displayMode: standard.countingMode === 'group_count' ? 'group' : 'instances_or_group',
      });
    }
    const missingModel = missing.get(standard.classId);
    const slotBox = bbox(missingModel?.slot_boxes?.[0] ?? missingModel?.slot_bbox_2d);
    const needsReview = !item || uncertain.has(standard.classId) || Boolean(item?.review_required) || (missingCount > 0 && !slotBox);
    return {
      classId: standard.classId,
      label: standard.label,
      expectedCount: standard.expectedCount,
      observedCount: observed,
      missingCount,
      status: missingCount > 0 ? (needsReview ? 'uncertain' : 'missing') : needsReview ? 'uncertain' : 'normal',
      unit: standard.unit || ({ socket: '个', bit_head: '枚', large_driver_handle: '件', small_driver_handle: '件', short_extension_adapter: '根', long_extension_bar: '根' } as Record<string, string>)[standard.classId] || '件',
      confidence: itemConfidence,
      provisionalStandard: standard.provisional,
      _slotBox: slotBox,
      _missingConfidence: confidence(missingModel?.confidence),
    };
  });
  const missingSlots = comparisons
    .filter((item) => item.status === 'missing' && item._slotBox)
    .map((item) => {
      const slot = item._slotBox!;
      return {
        classId: item.classId,
        label: `${item.label}缺失位置`,
        bbox: { x1: slot[0], y1: slot[1], x2: slot[2], y2: slot[3] },
        confidence: item._missingConfidence,
      };
    });
  const inventoryResult = comparisons.map(({ _slotBox, _missingConfidence, ...item }) => item);
  const reviewCount = inventoryResult.filter((item) => item.status === 'uncertain').length;
  const missingCount = inventoryResult.filter((item) => item.status === 'missing').length;
  const expectedTotal = inventoryResult.reduce((sum, item) => sum + item.expectedCount, 0);
  const observedTotal = inventoryResult.reduce((sum, item) => sum + item.observedCount, 0);
  return {
    requestId,
    mode: 'api',
    provider: 'vision-model',
    model: process.env.VISION_MODEL_NAME,
    status: missingCount ? 'missing' : reviewCount ? 'needs_review' : 'complete',
    image: { width, height },
    summary: { expectedTotal, observedTotal, missingKinds: missingCount, needsReviewKinds: reviewCount },
    inventory: inventoryResult,
    detections,
    missingSlots,
    warnings: [
      '结果由视觉模型生成，请人工复核低置信度、遮挡和批头数量。',
      ...(Array.isArray(raw.notes) ? raw.notes.filter((note: unknown) => typeof note === 'string') : []),
    ],
    uncertainRegions: (Array.isArray(raw.uncertain_items) ? raw.uncertain_items : [])
      .map((item: any) => bbox(item?.bbox_2d))
      .filter(Boolean),
    generatedAt: new Date().toISOString(),
  };
}

async function analyzeWithModel(input: {
  image: Buffer;
  mimeType: string;
  requestId: string;
  width: number;
  height: number;
  inventory: any[];
  socketRail: Buffer;
}): Promise<any> {
  if (!configured()) throw new Error('MODEL_NOT_CONFIGURED');
  const baseUrl = process.env.VISION_MODEL_BASE_URL!.replace(/\/$/, '');
  const prompt = `盘点这张黄色工具盒照片。先数图中物品，再比较标准数量，不可把标准数量当作观察结果。按类别逐项识别，只数真实工具，不数阴影、反光或空槽。套筒要沿工具盒右侧的竖向收纳轨道，从上到下逐个数金属套筒。每个类别返回可见实际数量。工具框紧贴可见工具组。若少于标准数量，只有清楚看到盒内对应空槽时才报告缺失并给出紧贴空槽的框。空槽框必须位于工具盒内托中，不能框整盒、盒外区域或反光。遮挡或无法确定时标记 uncertain，不要猜。\n类别及标准数：${JSON.stringify(input.inventory.map(({ classId, label, expectedCount }) => ({ classId, label, expectedCount })))}\n第一张图片是工具盒右侧套筒区高清局部，第二张是整盒照片。先依据第一张逐个数真实套筒，黑色圆槽是空槽，不是套筒。再看第二张确认这是工具盒内托的槽位。每个 count 少于 expectedCount 的类别都必须在 missing_items 返回一项，并且 slot_boxes 数组逐个框出数量差额对应的空槽。套筒缺一件时必须返回一个紧贴黑色圆槽的框，不能只返回数量差异。坐标按第二张整盒图左上原点计算，范围 0-1000。\n只返回 JSON：{"items":[{"class_id":"标准classId","count":0,"bbox_2d":[左,上,右,下]或null}],"missing_items":[{"class_id":"标准classId","slot_boxes":[[左,上,右,下]]}],"uncertain_items":[{"class_id":"标准classId","reason":"原因"}]}. items 必须包含每个类别。不要输出说明文字。`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${process.env.VISION_MODEL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.VISION_MODEL_NAME,
        temperature: 0,
        max_tokens: 1200,
        enable_thinking: false,
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${input.mimeType};base64,${input.socketRail.toString('base64')}` } },
          { type: 'text', text: '以下是完整工具盒全景，请确认空槽所属工具并给出空槽在此全景中的 0-1000 坐标。' },
          { type: 'image_url', image_url: { url: `data:${input.mimeType};base64,${input.image.toString('base64')}` } },
        ] }],
      }),
    });
    if (!response.ok) throw new Error(`MODEL_HTTP_${response.status}`);
    const body = await response.json();
    return normalizeModelResult(parseModelJson(extractContent(body)), input.requestId, input.width, input.height, input.inventory);
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const startedAt = performance.now();
  try {
    if (Number(req.headers.get('content-length')) > MAX_UPLOAD_BYTES + 65536) return fail('TOO_LARGE', '图片不能超过 7 MB', 413);
    const form = await req.formData();
    const file = form.get('image');
    if (!(file instanceof File)) return fail('IMAGE_REQUIRED', '请选择图片');
    if (file.size > MAX_UPLOAD_BYTES) return fail('TOO_LARGE', '图片不能超过 7 MB', 413);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !/[.](jpe?g|png|webp)$/i.test(file.name)) return fail('INVALID_TYPE', '请选择 JPG、PNG 或 WEBP 图片');
    const image = Buffer.from(await file.arrayBuffer());
    const signature = image[0] === 255 && image[1] === 216 ? 'jpeg' : image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png' : image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : '';
    const extension = file.name.split('.').pop()?.toLowerCase();
    const expectedExtension = signature === 'jpeg' ? ['jpg', 'jpeg'] : [signature];
    if (!expectedExtension.includes(extension || '') || file.type !== 'image/' + signature) return fail('INVALID_IMAGE', '图片内容与格式不符');
    const metadata = await sharp(image, { limitInputPixels: 40000000 }).metadata();
    if (!metadata.width || !metadata.height) return fail('INVALID_IMAGE', '图片无法解码');
    const optimized = await sharp(image, { limitInputPixels: 40000000 })
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 76 })
      .toBuffer({ resolveWithObject: true });
    const { data: socketRail } = await sharp(optimized.data)
      .extract({ left: Math.round(optimized.info.width * 0.7), top: Math.round(optimized.info.height * 0.12), width: Math.max(1, Math.round(optimized.info.width * 0.2)), height: Math.max(1, Math.round(optimized.info.height * 0.75)) })
      .resize({ width: 512, height: 2048, fit: 'inside' })
      .jpeg({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const requestId = crypto.randomUUID();
    const requestedMode = form.get('mode');
    const mode = requestedMode === 'mock' || requestedMode === 'api' || requestedMode === 'yolo' || requestedMode === 'real_slots'
      ? requestedMode
      : process.env.ANALYSIS_MODE || 'yolo';
    if (mode === 'mock') {
      const id = form.get('sampleId');
      if (typeof id !== 'string' || !id) return fail('SAMPLE_REQUIRED', 'Mock 模式请选择演示样例；自定义图片仅支持预览');
      try { return Response.json(mockResult(id, optimized.info.width, optimized.info.height)); } catch { return fail('UNKNOWN_SAMPLE', '未知演示场景'); }
    }
    const modelStartedAt = performance.now();
    try {
      if (mode === 'real_slots') {
        const detected = await runRealSlots(optimized.data);
        const missingSlots = detected.missingSlots.map((slot, index) => ({
          classId: slot.classId,
          label: `${slot.label}缺失位置`,
          bbox: { x1: slot.bbox[0], y1: slot.bbox[1], x2: slot.bbox[2], y2: slot.bbox[3] },
          confidence: slot.confidence,
          ratio: slot.ratio,
          id: `real-slot-${index + 1}`,
        }));
        return Response.json({
          requestId,
          mode: 'real_slots',
          provider: 'local-reference-slots',
          model: '实拍工具盒参考图配准',
          status: detected.status,
          image: { width: optimized.info.width, height: optimized.info.height },
          previewDataUrl: `data:image/jpeg;base64,${optimized.data.toString('base64')}`,
          summary: { expectedTotal: 0, observedTotal: 0, missingKinds: missingSlots.length, needsReviewKinds: missingSlots.length ? 0 : 1 },
          inventory: [],
          detections: [],
          missingSlots,
          uncertainRegions: [],
          warnings: ['结果来自实拍参考图配准。批头密集区域暂列为人工复核，红框表示稳定槽位的缺失候选。'],
          referenceId: detected.referenceId,
          registrationInliers: detected.registrationInliers,
          timings: { preprocessingMs: Math.round(modelStartedAt - startedAt), modelMs: Math.round(performance.now() - modelStartedAt), totalMs: Math.round(performance.now() - startedAt), originalImageBytes: image.length, sentImageBytes: optimized.data.length },
          generatedAt: new Date().toISOString(),
        });
      }
      const detected = await runYolo(optimized.data);
      const missingSlots = detected.emptySlots.map((slot, index) => ({
        classId: 'empty_slot',
        label: 'YOLO 空槽候选（类别待复核）',
        bbox: { x1: slot.bbox[0], y1: slot.bbox[1], x2: slot.bbox[2], y2: slot.bbox[3] },
        confidence: slot.confidence,
        id: `yolo-empty-${index + 1}`,
      }));
      const result = {
        requestId,
        mode: 'yolo',
        provider: 'local-yolo',
        model: 'YOLO11n · 实拍空槽',
        status: 'needs_review',
        image: { width: optimized.info.width, height: optimized.info.height },
        previewDataUrl: `data:image/jpeg;base64,${optimized.data.toString('base64')}`,
        summary: { expectedTotal: 0, observedTotal: 0, missingKinds: 0, needsReviewKinds: missingSlots.length || 1 },
        inventory: [],
        detections: [],
        missingSlots,
        uncertainRegions: [],
        warnings: ['YOLO 检测的是空槽候选，不推断缺失工具类别；请人工确认候选框。'],
        timings: { preprocessingMs: Math.round(modelStartedAt - startedAt), modelMs: Math.round(performance.now() - modelStartedAt), totalMs: Math.round(performance.now() - startedAt), originalImageBytes: image.length, sentImageBytes: optimized.data.length },
        generatedAt: new Date().toISOString(),
      };
      return Response.json(result);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'MODEL_ERROR';
      if (code === 'MODEL_NOT_CONFIGURED') return fail('MODEL_NOT_CONFIGURED', '视觉模型 API 未配置', 503);
      if (error instanceof Error && error.message.startsWith('YOLO_')) return fail('YOLO_INFERENCE_FAILED', 'YOLO 推理失败，请检查本地 Python 环境和模型权重', 503);
      if (code === 'MODEL_INVALID_JSON' || code === 'MODEL_INVALID_RESULT' || code === 'MODEL_EMPTY_RESPONSE') return fail('MODEL_INVALID_RESULT', '视觉模型返回结果无法解析，请重试', 502);
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) return fail('MODEL_TIMEOUT', '视觉模型请求超时，请重试', 504);
      if (error instanceof Error && (error.message.includes('Python') || error.message.includes('ENOENT'))) return fail('YOLO_INFERENCE_FAILED', '找不到本地 YOLO Python 环境，请确认 .venv-yolo 已安装', 503);
      return fail('MODEL_API_ERROR', '视觉模型调用失败，请检查 API 配置后重试', 502);
    }
  } catch {
    return fail('INVALID_IMAGE', '图片无法处理，请换一张图片重试');
  }
}
