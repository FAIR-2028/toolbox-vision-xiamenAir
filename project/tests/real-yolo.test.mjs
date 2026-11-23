import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3002';
const annotations = JSON.parse(await readFile(new URL('../data/real_yolo_100/annotations.json', import.meta.url)));

test('YOLO detects all eight user-annotated photographs', { timeout: 180000 }, async () => {
  for (const [index, photo] of annotations.entries()) {
    const image = await readFile(new URL(`../data/real_yolo_100/annotated_source/${String(index + 1).padStart(2, '0')}.png`, import.meta.url));
    const form = new FormData();
    form.append('image', new Blob([image], { type: 'image/png' }), 'photo.png');
    form.append('mode', 'yolo');
    const response = await fetch(`${base}/api/analyze`, { method: 'POST', body: form });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.mode, 'yolo');
    assert.equal(result.missingSlots.length, photo.boxes.length, `photo ${index + 1} detection count`);
    const remaining = [...result.missingSlots];
    for (const [x1, y1, x2, y2] of photo.boxes) {
      const expected = [x1 / photo.width, y1 / photo.height, x2 / photo.width, y2 / photo.height];
      let bestIndex = -1;
      let bestIoU = 0;
      remaining.forEach(({ bbox }, candidateIndex) => {
        const actual = [bbox.x1 / 1000, bbox.y1 / 1000, bbox.x2 / 1000, bbox.y2 / 1000];
        const intersection = Math.max(0, Math.min(expected[2], actual[2]) - Math.max(expected[0], actual[0])) *
          Math.max(0, Math.min(expected[3], actual[3]) - Math.max(expected[1], actual[1]));
        const area = ([left, top, right, bottom]) => (right - left) * (bottom - top);
        const iou = intersection / (area(expected) + area(actual) - intersection);
        if (iou > bestIoU) { bestIoU = iou; bestIndex = candidateIndex; }
      });
      assert.ok(bestIoU >= 0.5, `photo ${index + 1} annotation IoU ${bestIoU.toFixed(3)}`);
      remaining.splice(bestIndex, 1);
    }
  }
});
