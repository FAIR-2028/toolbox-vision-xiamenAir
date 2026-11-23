from pathlib import Path
import random

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'real_yolo'
SEED = 20261122
AUGMENTS_PER_SOURCE = 7


def transform(image, boxes, rng, np_rng):
    height, width = image.shape[:2]
    angle = rng.uniform(-4, 4)
    scale = rng.uniform(.96, 1.04)
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), angle, scale)
    matrix[0, 2] += rng.uniform(-.025, .025) * width
    matrix[1, 2] += rng.uniform(-.025, .025) * height
    warped = cv2.warpAffine(image, matrix, (width, height), borderMode=cv2.BORDER_REFLECT_101)

    transformed = []
    for x1, y1, x2, y2 in boxes:
        corners = np.float32([[x1, y1], [x2, y1], [x2, y2], [x1, y2]])
        points = cv2.transform(corners[None, :, :], matrix)[0]
        nx1 = max(0, float(points[:, 0].min()))
        ny1 = max(0, float(points[:, 1].min()))
        nx2 = min(width, float(points[:, 0].max()))
        ny2 = min(height, float(points[:, 1].max()))
        if nx2 - nx1 >= 6 and ny2 - ny1 >= 6:
            transformed.append((nx1, ny1, nx2, ny2))

    if rng.random() < .8:
        alpha = rng.uniform(.82, 1.18)
        beta = rng.uniform(-18, 18)
        warped = cv2.convertScaleAbs(warped, alpha=alpha, beta=beta)
    if rng.random() < .45:
        hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 1] *= rng.uniform(.85, 1.15)
        warped = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)
    if rng.random() < .3:
        noise = np_rng.normal(0, rng.uniform(1, 4), warped.shape).astype(np.int16)
        warped = np.clip(warped.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return warped, transformed


def main():
    rng = random.Random(SEED)
    np_rng = np.random.default_rng(SEED)
    image_dir = DATA / 'images' / 'train'
    label_dir = DATA / 'labels' / 'train'
    for index in range(1, 5):
        source = image_dir / f'{index:02d}.jpg'
        image = cv2.imread(str(source))
        height, width = image.shape[:2]
        boxes = []
        for line in (label_dir / f'{index:02d}.txt').read_text().splitlines():
            _, cx, cy, bw, bh = map(float, line.split())
            boxes.append(((cx - bw / 2) * width, (cy - bh / 2) * height,
                          (cx + bw / 2) * width, (cy + bh / 2) * height))
        for variant in range(1, AUGMENTS_PER_SOURCE + 1):
            augmented, new_boxes = transform(image, boxes, rng, np_rng)
            if len(new_boxes) != len(boxes):
                raise ValueError(f'Augmentation lost boxes for source {index}, variant {variant}')
            name = f'{index:02d}-aug-{variant:02d}'
            cv2.imwrite(str(image_dir / f'{name}.jpg'), augmented, [cv2.IMWRITE_JPEG_QUALITY, 96])
            lines = []
            for x1, y1, x2, y2 in new_boxes:
                lines.append(f'0 {(x1+x2)/2/width:.8f} {(y1+y2)/2/height:.8f} {(x2-x1)/width:.8f} {(y2-y1)/height:.8f}')
            (label_dir / f'{name}.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    images = list(image_dir.glob('*.jpg'))
    labels = list(label_dir.glob('*.txt'))
    if len(images) != 32 or len(labels) != 32:
        raise ValueError(f'Expected 32 images and labels, got {len(images)} and {len(labels)}')
    print(f'Generated {len(images)} images and {sum(len(p.read_text().splitlines()) for p in labels)} boxes')


if __name__ == '__main__':
    main()
