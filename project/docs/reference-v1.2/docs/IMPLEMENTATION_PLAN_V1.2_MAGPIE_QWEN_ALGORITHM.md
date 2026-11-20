# 机务小工具智能盘点 Demo — v1.2 完整开发实施方案

**本版目标：** 整合当前真实进度，让 Codex 和 Pi 通过 Magpie 中已配置的 LK888 Provider 进行开发；基于现有 E 盘 Next.js 项目完成一个可对外展示的工具盒盘点应用；同时预留两种未来视觉识别接入方式：① Qwen-VL API；② 本地 / 独立部署的工具识别算法 HTTP 服务。

**当前先交付：** 可稳定演示的 Mock Demo + 完整 UI + Docker Compose 一键启动 + Qwen / 算法 Provider 接口骨架。当前不要求 Qwen API Key，也不要求已有检测算法。

---

## 0. 最重要的架构决策

### 0.1 三条链路必须区分

**A. 开发 Agent 模型链路：Magpie + LK888**

```text
Codex ─┐
       ├──> Magpie Gateway ───> LK888 Provider / 已选模型
Pi ────┘
```

用途：让 Codex 写代码、让 Pi 审查代码。Codex 与 Pi 都必须使用 Magpie 中已配置的模型，并通过真实请求和 Magpie Usage 记录验证。

**B. 网页产品识别链路：预留 Qwen 和算法接口**

```text
浏览器上传照片
       |
       v
Next.js /api/analyze
       |
       v
VisionProvider 统一接口
       |
       +----> MockVisionProvider（当前默认，可展示）
       |
       +----> QwenVisionProvider（预留，后续配置 Qwen API）
       |
       +----> ToolAlgorithmProvider（预留，后续接本地/独立算法服务）
       |
       v
统一 VisionAnalysis JSON
       |
       v
图片标注 / 工具数量 / 缺失清单 / 人工复核
```

**C. Docker 运行链路**

```text
Docker Compose
      |
      +----> Next.js Web
      |
      +----> Demo / Mock（不依赖外部 API）
      |
      +----> 可选 Qwen API（服务端出站请求）
      |
      +----> 可选 Tool Algorithm HTTP Service（按网络配置访问）
```

### 0.2 Magpie 不等于 Qwen，也不等于视觉算法

- Magpie 在本项目中首先是 Codex / Pi 的开发模型管理器和本地 Gateway。
- 网页运行时的识别 Provider 与 Magpie 的开发 Agent Provider 是两套配置。
- 本版网页识别接口预留 `mock`、`qwen`、`algorithm` 三种 Provider。
- 不要把 LK888 Provider Key 当作 Qwen API Key。
- 不要把 Magpie 的 Gateway 标识 Key 当作 LK888 上游 Key。
- 不要在网页里默认把所有图片请求转给 Magpie。除非用户后续明确要求增加 Magpie Vision 作为第四种运行时 Provider，否则本版只预留 Qwen 与算法两个真实识别接口。

### 0.3 当前范围

| 本次要完成 | 本次不要求完成 |
|---|---|
| Codex / Pi 通过 Magpie + LK888 开发 | 不重装 Codex / Pi / Magpie / Herdr |
| Herdr 三 Pane 实际工作 | 不重建项目 |
| 完整 Demo / Mock UI | 不训练 YOLO 或其他模型 |
| 预留 Qwen-VL Provider 接口 | 不要求现在提供 Qwen Key |
| 预留工具识别算法 HTTP 接口 | 不要求现在有算法服务 |
| Docker Compose 一键启动 | 不要求现在公网部署 |
| 接口契约、错误处理和切换配置 | 不把 Mock 伪装成真实识别 |

---

## 1. 当前项目和工具状态（以用户最近描述为准）

| 项目 | 已完成 / 用户报告 | 仍需验证 / 完成 |
|---|---|---|
| Codex | 已安装；CLI 可运行；原配置修改前已备份 | 新会话是否确实通过 Magpie / LK888，需要 Usage 证明 |
| Magpie | 已安装；已添加 LK888 供应商；用户报告“现在好像可以了”；用户提供 Base URL 主机为 `https://api.lk888.ai` | 需要确认 Magpie 当前实际保存的 Base URL、模型列表、Codex / Pi 选模及 Usage 记录；不得擅自重置 |
| Pi | 已安装；曾使用旧 Codex 来源成功请求 | 需要切换 / 确认 Magpie 选定模型，做一次新会话请求和只读项目审查 |
| Herdr TUI | 已安装；Codex / Pi 集成曾显示 `current` | 需要实际建立 Codex、Pi、网页日志三个 Pane |
| Docker / Compose | CLI 命令可运行 | Engine 之前未验收；Windows 虚拟机平台启用后曾提示重启，需 `docker info` 确认 |
| 项目 | `E:\toolbox-vision-demo`；Next.js 页面、四种 Mock 场景、基础后端接口已编写；用户报告生产构建通过 | 前端体验、图片上传状态、测试、Qwen / 算法 Provider 接口、Docker 交付仍需验收 |

**重要：** 本工作包根据用户提供的本机状态编写。生成文件的环境无法直接访问用户的 E 盘、Magpie GUI、LK888 账户或 Docker Engine，因此不宣称上述未验证项目已经通过。

### 1.1 LK888 Provider 信息

用户提供的服务商 API Base URL 主机：

```text
https://api.lk888.ai
```

注意：
- Magpie 自定义 OpenAI-compatible Provider 通常需要 Chat Base URL 以 `/v1` 结尾；但应以 Magpie 当前 Providers 页面实际保存值和成功请求为准。
- 不要擅自覆盖一个已经能用的 Provider 配置。
- 不要在代码、文档、Git 或 Codex 对话里写入完整 LK888 API Key。
- 模型 ID 必须从 Magpie 实际模型列表读取，不能猜测。
- 不要因为某个模型名称看起来像 Qwen，就断言它支持视觉输入。

---

## 2. 开发 Agent：让 Codex 和 Pi 真正通过 Magpie 工作（Gate A）

### 2.1 先检查现有配置，不重装

打开 Magpie：

1. Providers → 确认 LK888 Provider 存在。
2. 查看其 Base URL（不要公开 Key）。
3. 如果有 Test，执行 Test。
4. 刷新模型列表。
5. 记录模型 ID（`provider/model`）和测试结果。
6. Agents → 分别查看 Codex、Pi 当前选择的模型。
7. 如果两者尚未选 LK888 下模型，分别选择一个实际存在且可用的模型。
8. 保存后完全退出旧 Codex 会话 / App，重新启动 Codex；重新启动 Pi 或新建 Pi 会话。

Magpie CLI 可用时：

```powershell
magpie providers
magpie models
magpie ls
```

若 CLI 当前版本支持 Usage：

```powershell
magpie usage 7d
```

命令输出可能含账号或配置元数据，分享前脱敏。

### 2.2 真实请求验证

Codex 新会话：

```text
这是一次 Magpie 路由验证。不要修改文件，不要执行工具。
只回复：CODEX_MAGPIE_LK888_OK
```

Pi 新会话：

```text
这是一次 Magpie 路由验证。不要修改文件，不要执行工具。
只回复：PI_MAGPIE_LK888_OK
```

检查 Magpie Usage：
- 出现一条新的 Codex 请求。
- 出现一条新的 Pi 请求。
- 两条请求显示的 Provider / Model 是预期 LK888 模型。
- 两条请求成功。
- 没有静默回退到旧模型。

**Gate A 通过条件：** 两个 Agent 都有新请求证据。只看模型选择界面或配置文件不算通过。

### 2.3 Codex / Pi 分工

- Codex：唯一默认代码写入者，负责实现、修复、测试和 Docker。
- Pi：默认只读审查者，不直接改文件。
- Magpie：管理两个 Agent 的模型来源和模型选择。
- Herdr：管理终端 Pane 和 Agent 会话状态。

Pi 审查任务应给出问题等级、文件路径、复现方法和修复建议。Codex 判断后修改并测试。禁止两个 Agent 同时编辑同一工作树。

---

## 3. Herdr 三 Pane（Gate B）

项目目录：

```powershell
Set-Location E:\toolbox-vision-demo
herdr
```

建立三个 Pane：

| Pane | 命令 | 用途 |
|---|---|---|
| A | `codex` | 主开发 |
| B | `pi --tools read,grep,find,ls` | 只读审查（如果 Pi 当前版本支持该参数；否则使用只读提示词和权限设置） |
| C | `npm run dev` | 本地 Next.js 页面和日志 |

Docker Engine 通过验收后，Pane C 可切换：

```powershell
docker compose logs -f web
```

Gate B：
- 三个 Pane 都真实运行。
- Codex、Pi 新会话均通过 Magpie。
- Pi 对当前项目完成一次只读审查。
- 本地网页可打开。

---

## 4. 保护现有 E 盘项目

项目路径固定：

```text
E:\toolbox-vision-demo
```

第一轮只审计，不改业务代码：

```powershell
Set-Location E:\toolbox-vision-demo
Get-Location
git status --short
git branch --show-current
git log -1 --oneline
Get-ChildItem -Force
Get-Content package.json
```

要求：
- 不创建新的 Next.js 空项目。
- 不覆盖已有页面、API、Mock 图片或配置。
- 不执行 `git reset --hard`、`git clean -fd`。
- 不丢弃用户未提交修改。
- 工作区干净时才建议创建 `feature/vision-provider-interfaces` 分支。
- 检查 `.env*` 在 `.gitignore` 中，不读取、不输出密钥。
- 先复测当前 `npm run build`，记录基线。

输出 `docs/verification/PROJECT_BASELINE.md`。

---

## 5. 产品展示目标

应用名称：**机务小工具智能盘点**

主要流程：

1. 上传工具盒照片。
2. 选择识别模式：Demo 演示 / Qwen-VL（未配置时禁用）/ 工具识别算法（未配置时禁用）。
3. Demo 模式选择四种预置样例。
4. 展示原图和可切换的标注层。
5. 显示标准数量、识别数量、缺失数量、待复核数量。
6. 右侧用醒目红色卡片展示缺失工具、缺少数量和位置。
7. 工具清单显示标准、识别、差异、状态。
8. 支持上传、替换图片、重新分析、切换样例。
9. 支持分析中、成功、需复核、错误、未配置等状态。
10. Demo 模式有清晰的 `MOCK 固定演示数据` 标识；Qwen / 算法模式显示实际 Provider 来源。

### 5.1 前端视觉方向

- 参考 `frontend-sample/index.html`。
- 工业科技风 + 现代 SaaS Dashboard。
- 顶部深蓝导航，主体浅灰白。
- 图片检测区域是页面主视觉，尽量大。
- 绿色表示识别到且符合标准；红色表示缺失 / 空槽；黄色表示需人工复核。
- 缺失数量同时在统计卡和缺失卡片突出显示。
- 没有可靠空槽 bbox 时只显示文字定位，不画虚构框。
- 适配桌面和窄屏。

---

## 6. 工具标准清单（暂定，不可当作正式 BOM）

唯一配置源：

```text
config/tool_inventory.json
```

| 工具类别 | 标准数量 | 单位 | 说明 |
|---|---:|---|---|
| 大号螺丝刀手柄组件 | 1 | 件 | 含连接杆整体 |
| 小号螺丝刀手柄组件 | 1 | 件 | 含连接结构整体 |
| 套筒 | 8 | 个 | 按原照片估算 |
| 批头 | 约 40 | 枚 | 低置信度暂定，需人工逐个确认 |
| 短延长杆 / 转接杆 | 1 | 根 | 按原照片估算 |
| 长延长杆 | 1 | 根 | 按原照片估算 |

必须保留 `provisional: true` 等字段。UI 对批头显示“约 40 / 暂定数量”。

---

## 7. 统一视觉 Provider 架构（本版核心新增）

### 7.1 统一接口

前端不直接调用任何模型或算法服务。Next.js 服务端通过一个 Provider Registry 选择后端。

建议目录（适配现有项目，不强制整体重构）：

```text
lib/vision/
  types.ts
  provider.ts
  provider-registry.ts
  mock/
    mock-provider.ts
  qwen/
    qwen-provider.ts
  algorithm/
    algorithm-provider.ts
  normalize/
    normalize-analysis.ts
  compare/
    compare-inventory.ts
```

统一接口：

```ts
export type VisionProviderId = "mock" | "qwen" | "algorithm";

export interface VisionProvider {
  id: VisionProviderId;
  displayName: string;
  capabilities: {
    acceptsImage: boolean;
    returnsDetections: boolean;
    returnsEmptySlots: boolean;
    supportsHealthCheck: boolean;
  };
  isConfigured(): Promise<boolean>;
  analyze(input: VisionAnalyzeInput): Promise<VisionAnalysis>;
  healthCheck?(): Promise<VisionProviderHealth>;
}
```

所有 Provider 必须输出同一 `VisionAnalysis` 结构。UI 不得知道各家 API 的差异。

### 7.2 Provider 选择规则

环境变量：

```env
APP_DEFAULT_MODE=demo
VISION_PROVIDER=mock

# Qwen provider (disabled until user supplies credentials)
QWEN_API_BASE_URL=
QWEN_API_KEY=
QWEN_MODEL=
QWEN_API_PROTOCOL=openai-compatible
QWEN_TIMEOUT_MS=90000

# Future local / external toolbox detection algorithm service
TOOL_ALGORITHM_BASE_URL=
TOOL_ALGORITHM_API_KEY=
TOOL_ALGORITHM_PREDICT_PATH=/predict
TOOL_ALGORITHM_HEALTH_PATH=/health
TOOL_ALGORITHM_TIMEOUT_MS=90000
```

- 默认 `VISION_PROVIDER=mock`。
- Qwen 只有在 `QWEN_API_BASE_URL`、`QWEN_API_KEY`、`QWEN_MODEL` 都存在时才标记 configured。
- Algorithm 只有在 `TOOL_ALGORITHM_BASE_URL` 有值且健康检查成功时才标记 configured。
- 未配置的 Provider 在 UI 中显示“尚未配置”，不允许点击真实分析。
- 选择未配置 Provider 时，服务端返回 `PROVIDER_NOT_CONFIGURED`，不要退回 Mock。
- 不要在前端暴露任何 API Key。

### 7.3 API 路由

保留现有 API 结构；如现有接口可复用就局部增强。建议：

```text
GET  /api/vision/providers
POST /api/analyze
GET  /api/health
```

`GET /api/vision/providers` 返回可用 Provider 元数据，不包含任何密钥：

```json
{
  "defaultProvider": "mock",
  "providers": [
    { "id": "mock", "name": "Demo 演示", "configured": true, "enabled": true },
    { "id": "qwen", "name": "通义千问视觉模型", "configured": false, "enabled": false },
    { "id": "algorithm", "name": "工具识别算法", "configured": false, "enabled": false }
  ]
}
```

`POST /api/analyze`：
- multipart 字段：`file`、`provider`、可选 `sampleId`。
- `provider=mock` 且 `sampleId` 属于四个预置场景：返回固定演示结果。
- `provider=mock` 且是任意自定义图片：只做预览，不得返回固定识别结果；可返回 409 `CUSTOM_IMAGE_REQUIRES_REAL_PROVIDER`。
- `provider=qwen`：调用 Qwen Adapter。
- `provider=algorithm`：调用算法 Adapter。
- 所有响应都附 `requestId`、`provider`、`sourceLabel`。
- API 失败时保留图片并显示错误；不得自动回退 Mock。

---

## 8. Qwen-VL API 接口预留（本次不要求配置 Key）

### 8.1 设计目标

保留一个真正可接入 Qwen-VL 的服务端 Provider。当前不要求用户提供 API Key，也不要求本次验证 Qwen 调用成功。

接口使用统一 `VisionProvider`，内部可配置 OpenAI-compatible Chat Completions 或 DashScope 原生协议。

环境变量：

```env
QWEN_API_BASE_URL=
QWEN_API_KEY=
QWEN_MODEL=
QWEN_API_PROTOCOL=openai-compatible
QWEN_TIMEOUT_MS=90000
```

**Base URL 不要硬编码成一个通用值。** 用户未来从阿里云百炼获取实际地域 / Workspace 专属 Base URL；如果 Qwen API 是其他服务商提供，也使用该服务商的实际兼容地址。模型 ID 必须以账号可调用列表为准。

### 8.2 OpenAI-compatible 请求

如果用户未来提供 OpenAI 兼容接口，使用：

```http
POST {QWEN_API_BASE_URL}/chat/completions
Authorization: Bearer {QWEN_API_KEY}
Content-Type: application/json
```

请求消息包含 text + image_url（data URL 或服务商支持的图片 URL）。示意：

```json
{
  "model": "由用户配置的实际 Qwen-VL 模型 ID",
  "temperature": 0.1,
  "messages": [
    {
      "role": "system",
      "content": "你是工具盒盘点助手。仅返回 JSON。不得猜测工具或空槽位；无法确认时标记 review。"
    },
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "识别工具类别、可见数量、bbox 和可靠空槽位。" },
        {
          "type": "image_url",
          "image_url": { "url": "data:image/jpeg;base64,..." }
        }
      ]
    }
  ]
}
```

上面是接口格式示意，不代表已经配置了模型或 Key。

### 8.3 DashScope 原生协议

如果用户给的是 DashScope 原生 API，Codex 应实现独立 protocol adapter，不要把原生 DashScope 路径误拼成 OpenAI-compatible `/chat/completions`。通过 `QWEN_API_PROTOCOL=dashscope-native` 选择。

阿里云百炼官方文档：
- OpenAI 兼容 Chat：<https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions>
- Qwen-VL OpenAI Vision 兼容：<https://help.aliyun.com/zh/model-studio/qwen-vl-compatible-with-openai>

官方文档显示 Qwen-VL 支持 OpenAI 兼容多模态消息格式；Base URL 因地域 / Workspace 而异。Codex 必须以用户未来提供的真实配置为准，不得写死某个地域 URL。

### 8.4 Qwen Adapter 本次完成标准

- Provider 类 / 模块存在。
- 读取服务端环境变量。
- 未配置时 `isConfigured()` 返回 false。
- 配置不完整时返回可读错误。
- 请求、超时、API 错误、JSON 解析和 Schema 校验代码结构已预留。
- 本次无 Key 时，不伪造“Qwen 调用成功”。
- README 说明未来只需填写 Qwen 配置即可启用。

---

## 9. 工具识别算法接口预留（本次不开发算法）

### 9.1 目标

未来可能接入 YOLO、RT-DETR、Grounding DINO、自研检测服务或其他工具识别算法。本次不决定算法品牌，不训练模型，只约定稳定的 HTTP 接口。

环境变量：

```env
TOOL_ALGORITHM_BASE_URL=
TOOL_ALGORITHM_API_KEY=
TOOL_ALGORITHM_PREDICT_PATH=/predict
TOOL_ALGORITHM_HEALTH_PATH=/health
TOOL_ALGORITHM_TIMEOUT_MS=90000
```

### 9.2 算法服务调用契约

请求：

```http
POST {TOOL_ALGORITHM_BASE_URL}/predict
Content-Type: multipart/form-data
Authorization: Bearer {TOOL_ALGORITHM_API_KEY}   # 配置 Key 时才发送
```

multipart 字段：

- `file`：原始图片。
- `inventory`：工具标准清单 JSON。
- `requestId`：请求 ID。
- `coordinateSystem`：`normalized_0_1000`。

算法服务可以内部使用 Python、PyTorch、ONNX、TensorRT 等；Web 项目不绑定其实现语言。

### 9.3 算法服务统一响应

```json
{
  "requestId": "uuid",
  "imageWidth": 1024,
  "imageHeight": 1365,
  "coordinateSystem": "normalized_0_1000",
  "detections": [
    {
      "classId": "socket",
      "label": "套筒",
      "bbox": [720, 180, 900, 270],
      "count": 1,
      "confidence": 0.96
    }
  ],
  "emptySlots": [],
  "uncertainRegions": [],
  "notes": []
}
```

这只是接口契约，不是真实检测输出。Algorithm Adapter 负责把服务响应转换成统一 `VisionAnalysis`。

### 9.4 算法 Adapter 本次完成标准

- HTTP Client / Adapter 类已建立。
- URL、路径、超时、Key 从服务端环境变量读取。
- 请求使用 multipart，不将图片塞进 URL。
- 处理连接失败、超时、非 2xx、JSON 无效、bbox 越界。
- 未配置时 UI 显示“算法接口未配置”。
- 未有算法服务时不允许误判成功。
- 提供 `contracts/tool-algorithm-api.example.json` 作为未来算法团队的接口交接文件。

---

## 10. 统一 VisionAnalysis 数据契约

所有 Provider 最终输出：

```ts
type OverallStatus = "complete" | "missing" | "review" | "error";

interface VisionDetection {
  id: string;
  classId: string;
  label: string;
  bbox: [number, number, number, number]; // normalized 0..1000
  count: number;
  confidence?: number;
}

interface MissingItem {
  classId: string;
  label: string;
  expectedCount: number;
  observedCount: number;
  missingCount: number;
  unit: string;
  locationText?: string;
  slotBbox?: [number, number, number, number] | null;
  locationReliable: boolean;
  confidenceLevel: "high" | "medium" | "low";
}

interface VisionAnalysis {
  requestId: string;
  provider: "mock" | "qwen" | "algorithm";
  sourceLabel: string;
  model?: string;
  overallStatus: OverallStatus;
  imageWidth: number;
  imageHeight: number;
  expectedTotal: number;
  observedTotal: number;
  missingTotal: number;
  reviewCount: number;
  inventory: InventoryComparison[];
  detections: VisionDetection[];
  missingItems: MissingItem[];
  uncertainRegions: BBox[];
  warnings: string[];
}
```

坐标统一为原始显示图片的 0–1000 归一化 `[x1,y1,x2,y2]`。Provider Adapter 负责模型原始坐标转换，前端不处理模型特有坐标。

### 10.1 缺失判断

```text
missingCount = max(expectedCount - observedCount, 0)
excessCount  = max(observedCount - expectedCount, 0)
```

但模型漏检不等于物品一定缺失：
- 有可信空槽 / 清晰缺失证据，才可标记 `missing`。
- 只有数量差异但无法判断遮挡、反光或漏检时，标记 `review`。
- `slotBbox` 为空或 `locationReliable=false` 时，不画红色空槽框。
- 批头约 40 枚是暂定标准，默认需复核。

---

## 11. 前端样例与展示规则

样例文件：

```text
frontend-sample/index.html
frontend-sample/assets/
```

双击 HTML 可预览，不需要 Node、Docker 或 API Key。

四种样例：
1. 完整工具盒。
2. 缺少 1 个套筒。
3. 缺少 3 枚批头。
4. 缺少 1 根长延长杆。

要求：
- 先让用户确认样例页面，再移植到 E 盘 Next.js 项目。
- 样例切换使用固定 Mock 数据。
- 自定义图片上传只预览，不返回固定 Mock 结果。
- UI 明确标记 `MOCK 固定演示数据`。
- 真实 Qwen / Algorithm 模式显示实际来源和模型 / 算法名称。
- 分析失败不得显示上一次图片的旧结果。
- 重新分析使用新的 requestId。

---

## 12. Docker 一键启动

### 12.1 Docker Engine 验收

用户之前 Docker CLI 可运行，但 Engine 未验收。重启 Windows 后执行：

```powershell
docker --version
docker compose version
docker info
```

只有 `docker info` 能连接 Server 才算 Engine 可用。

### 12.2 Engine 未就绪时

不阻塞开发，先运行：

```powershell
Set-Location E:\toolbox-vision-demo
npm run dev
```

### 12.3 一键启动

项目必须提供：

```powershell
Set-Location E:\toolbox-vision-demo
docker compose up --build -d
docker compose ps
```

浏览器打开：

```text
http://localhost:3000
```

查看日志：

```powershell
docker compose logs -f web
```

停止：

```powershell
docker compose down
```

### 12.4 Docker 环境变量

- Demo / Mock 默认启动，不依赖 Qwen Key 或算法服务。
- Qwen 模式通过服务端环境变量传入 `QWEN_API_BASE_URL`、`QWEN_API_KEY`、`QWEN_MODEL`。
- 算法模式通过服务端环境变量传入 `TOOL_ALGORITHM_BASE_URL`、`TOOL_ALGORITHM_API_KEY`。
- 不把 `.env` 复制进镜像。
- `.env*` 加入 `.gitignore`。
- 不在前端使用 `NEXT_PUBLIC_` 暴露密钥。
- 若算法服务运行在 Windows 主机、Web 运行在 Docker，容器中不能用 `127.0.0.1` 访问宿主机；Docker Desktop 使用 `host.docker.internal` 并实际测试连通性。

---

## 13. 开发阶段与验收 Gate

### Phase 0 — 审计现有 E 盘项目

只读检查文件结构、Git 状态、API、Mock、package.json、构建结果。输出 `docs/verification/PROJECT_BASELINE.md`。不重建、不覆盖、不删除用户修改。

### Phase 1 — Magpie Agent 路由（Gate A）

验证 LK888 Provider、模型发现、Codex/Pi 选模、新会话、真实请求、Usage 记录。未通过则先排查，不宣称通过。

### Phase 2 — Herdr 三 Pane（Gate B）

建立 Codex、Pi、网页日志三个 Pane；Pi 只读审查当前项目。

### Phase 3 — Demo / Mock 展示

移植前端样例，完成图片上传预览、四种场景、标注、统计、缺失卡片、重新识别和错误状态。浏览器实际测试。

### Phase 4 — Provider 接口骨架（Gate C）

建立 `VisionProvider`、Mock、Qwen、Algorithm 三种 Provider。Qwen / Algorithm 未配置时显示未配置状态。统一数据 Schema、错误代码和 Provider 切换。

### Phase 5 — Qwen / 算法接口自检

没有 Qwen Key 和算法服务时：
- TypeScript 编译通过。
- 未配置 Provider 正确返回 `PROVIDER_NOT_CONFIGURED`。
- Demo / Mock 不受影响。
- 提供未来接入文档和测试示例。

只有用户以后提供实际 Qwen 配置或算法服务，才进行真实 API 联调。

### Phase 6 — Docker 交付（Gate D）

Docker Engine 通过验收后，`docker compose up --build -d` 成功，健康检查通过，浏览器可访问。

### Phase 7 — 最终交付

交付项目代码、Magpie 路由验收摘要、Herdr 工作区说明、Provider 接口说明、Docker README、测试记录、已知限制。

---

## 14. Codex / Pi 工作提示词

### Codex 主开发提示词

```text
你是本项目唯一主代码写入 Agent。
先阅读本文件和 CODEX_START_HERE.md。
保留 E:\toolbox-vision-demo 现有项目，不重建、不覆盖用户修改。
先验证 Codex / Pi 新会话真实通过 Magpie + LK888，并以 Magpie Usage 作为证据。
随后在 Herdr 中使用 Codex、Pi、网页日志三个 Pane。
先实现稳定 Demo / Mock 展示。
建立统一 VisionProvider 接口，并预留 Qwen-VL API Adapter 和 Tool Algorithm HTTP Adapter。
本次不要求 Qwen Key，不要求已有算法服务。
未配置 Provider 必须明确返回未配置错误，绝不伪造识别成功。
最后完成 Docker Compose 一键启动和浏览器验收。
每阶段运行测试并记录实际结果。
```

### Pi 只读审查提示词

```text
你是只读审查 Agent，不得编辑、创建、删除项目文件。
检查 Codex 当前 diff：
1. 是否保留原项目和用户修改；
2. Magpie 是否有真实 Usage 证据；
3. Mock / Qwen / Algorithm Provider 是否隔离；
4. Qwen Key 是否只在服务端；
5. 算法接口契约是否清晰；
6. 统一 bbox 坐标和越界检查是否正确；
7. 缺失位置没有证据时是否避免画假框；
8. 上传 / 重新识别 / 错误状态是否完整；
9. Docker Compose 是否能独立运行 Demo。
输出严重问题、一般问题、文件路径、复现方法和修复建议，不要改文件。
```

---

## 15. 官方资料

### Magpie

- Get started：<https://usemagpie.ai/docs/start>
- Integrate app / Gateway：<https://usemagpie.ai/docs/integrate>
- Magpie Image recognition：<https://usemagpie.ai/docs/images>

Magpie 官方说明：
- 本地 Gateway 默认 `127.0.0.1:3425`。
- OpenAI-compatible Base URL 为 `http://127.0.0.1:3425/v1`。
- `GET /v1/models` 返回用户在 Magpie 中启用的模型；如果已知，可提供 `modalities`。
- `POST /v1/chat/completions` 支持转发图像请求。
- 同机调用可以使用 `magpie-<app-id>` 标识应用；跨机器访问需启用 Share on local network 并使用 Gateway Key。

### Qwen

- OpenAI-compatible Chat：<https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions>
- Qwen-VL OpenAI Vision：<https://help.aliyun.com/zh/model-studio/qwen-vl-compatible-with-openai>

Qwen Base URL 因地域和 Workspace 不同，必须使用用户实际控制台提供的 URL。不得硬编码统一地址。

### Herdr / Docker

- Herdr TUI：<https://herdr.dev/tui/docs/quick-start/>
- Herdr Integrations：<https://herdr.dev/tui/docs/integrations/>
- Docker Desktop：<https://docs.docker.com/get-started/get-docker/>

---

## 16. 最终执行顺序（不得调整）

1. 保护并审计 E 盘现有项目。
2. 检查 Magpie LK888 Provider 和实际模型列表。
3. 分别让 Codex、Pi 通过 Magpie 发起新请求，查 Usage。
4. 建立 Herdr 三 Pane，Pi 只读审查项目。
5. 先完成 Demo / Mock 完整展示。
6. 建立 Qwen-VL Provider 接口。
7. 建立工具识别算法 Provider 接口。
8. 完成统一 Schema、错误处理和配置开关。
9. 验证未配置 Provider 不会误报成功。
10. Docker Engine 就绪后完成一键启动和最终验收。

**任何阶段都必须提供真实运行证据。配置文件存在、软件已安装、生产构建通过，都不能替代实际请求和浏览器端到端测试。**
