from pathlib import Path
import json
import random
import shutil

import cv2
import numpy as np
import yaml

from augment_annotated_photos import transform

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'real_yolo_100'
TEMP = Path('C:/Users/Administrator/AppData/Local/Temp')
NEW_FILES = [
    'pi-clipboard-b3bcd191-7c01-4f69-8fde-5e6a29d1400f.png',
    'pi-clipboard-fb139914-cb95-493c-aa38-2b81af7fbd89.png',
    'pi-clipboard-6d506166-1bc4-4cba-b6c9-b7857732532b.png',
    'pi-clipboard-c33c6cf8-2ba8-4289-8370-edf3c69c667a.png',
]


def main():
    images = DATA / 'images/train'
    labels = DATA / 'labels/train'
    source = DATA / 'annotated_source'
    for directory in (images, labels, source):
        directory.mkdir(parents=True, exist_ok=True)
    inputs = [ROOT / 'data/annotated_source' / f'{i:02}.png' for i in range(1, 5)] + [TEMP / name for name in NEW_FILES]
    rng = random.Random(20261123)
    np_rng = np.random.default_rng(20261123)
    manifest = []
    for index, path in enumerate(inputs, 1):
        image = cv2.imread(str(path))
        if image is None:
            raise ValueError(f'Cannot read {path}')
        shutil.copy2(path, source / f'{index:02}.png')
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        blue = cv2.inRange(hsv, np.array([80, 80, 80]), np.array([115, 255, 255]))
        contours, _ = cv2.findContours(blue, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes = sorted([(x, y, x+w, y+h) for c in contours for x, y, w, h in [cv2.boundingRect(c)] if cv2.contourArea(c) > 500 and w >= 20 and h >= 20], key=lambda b: (b[1], b[0]))
        if not boxes:
            raise ValueError(f'No annotation boxes in {path}')
        mask = cv2.dilate(blue, np.ones((3, 3), np.uint8), iterations=1)
        clean = cv2.inpaint(image, mask, 5, cv2.INPAINT_TELEA)
        h, w = clean.shape[:2]
        manifest.append({'source': str(path), 'width': w, 'height': h, 'boxes': boxes})
        count = 13 if index <= 4 else 12
        for variant in range(count):
            picture, current = (clean, boxes) if variant == 0 else transform(clean, boxes, rng, np_rng)
            if len(current) != len(boxes):
                raise ValueError(f'Lost boxes in image {index} variant {variant}')
            stem = f'{index:02}-{variant:02}'
            if not cv2.imwrite(str(images / f'{stem}.jpg'), picture, [cv2.IMWRITE_JPEG_QUALITY, 96]):
                raise OSError(f'Could not write image {stem}')
            lines = [f'0 {(x1+x2)/(2*w):.8f} {(y1+y2)/(2*h):.8f} {(x2-x1)/w:.8f} {(y2-y1)/h:.8f}' for x1, y1, x2, y2 in current]
            (labels / f'{stem}.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    assert len(list(images.glob('*.jpg'))) == len(list(labels.glob('*.txt'))) == 100
    (DATA / 'annotations.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    (DATA / 'dataset.yaml').write_text(yaml.safe_dump({'path': DATA.as_posix(), 'train': 'images/train', 'val': 'images/train', 'names': {0: 'empty_slot'}}, sort_keys=False), encoding='utf-8')
    print('images=100 originals=8 boxes=' + str(sum(len(x['boxes']) for x in manifest)))
    print('boxes_per_original=' + str([len(x['boxes']) for x in manifest]))


if __name__ == '__main__':
    main()
