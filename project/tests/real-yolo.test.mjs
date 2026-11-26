import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const dataset = new URL('../data/real_yolo_100_originals/', import.meta.url);

test('training images have matching labels and no exact duplicate images', async () => {
  const imageDirectory = new URL('images/train/', dataset);
  const labelDirectory = new URL('labels/train/', dataset);
  const images = (await readdir(imageDirectory)).filter((name) => name.endsWith('.jpg')).sort();
  const labels = (await readdir(labelDirectory)).filter((name) => name.endsWith('.txt')).sort();

  assert.equal(images.length, 98);
  assert.deepEqual(labels, images.map((name) => name.replace(/\.jpg$/, '.txt')));

  const hashes = new Set();
  for (const name of images) {
    const image = await readFile(new URL(name, imageDirectory));
    const hash = createHash('sha256').update(image).digest('hex');
    assert.equal(hashes.has(hash), false, `${name} duplicates another training image`);
    hashes.add(hash);

    const label = await readFile(new URL(name.replace(/\.jpg$/, '.txt'), labelDirectory), 'utf8');
    for (const line of label.trim().split(/\r?\n/)) {
      const [classId, ...box] = line.split(/\s+/).map(Number);
      assert.equal(classId, 0);
      assert.equal(box.length, 4);
      assert.ok(box.every((value) => Number.isFinite(value) && value >= 0 && value <= 1), `${name} has an invalid box`);
      assert.ok(box[2] > 0 && box[3] > 0, `${name} has an empty box`);
    }
  }
});
