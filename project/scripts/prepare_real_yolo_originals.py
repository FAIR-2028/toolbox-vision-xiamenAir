from pathlib import Path
import json
import random
import shutil
import cv2
import numpy as np
import yaml
from augment_annotated_photos import transform

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/real_yolo_100'
DATA = ROOT / 'data/real_yolo_100_originals'


def main():
    for folder in ('images/train', 'labels/train'):
        target = DATA / folder
        target.mkdir(parents=True, exist_ok=True)
        for src in (SOURCE / folder).iterdir():
            if src.is_file():
                shutil.copy2(src, target / src.name)
    mapped = json.loads((SOURCE / 'mapped_originals.json').read_text(encoding='utf-8'))
    rng = random.Random(20261124)
    np_rng = np.random.default_rng(20261124)
    for i, item in enumerate(mapped, 1):
        image = cv2.imread(str(ROOT.parent / 'datasets' / item['file']))
        if image is None:
            raise ValueError(f"Cannot read {item['file']}")
        h, w = image.shape[:2]
        for v in range(6, 12):
            result, boxes = (image, item['boxes']) if v == 6 else transform(image, item['boxes'], rng, np_rng)
            if len(boxes) != len(item['boxes']):
                raise ValueError(f'Lost box in source {i}, variant {v}')
            stem = f'{i:02}-{v:02}'
            if not cv2.imwrite(str(DATA / 'images/train' / f'{stem}.jpg'), result, [cv2.IMWRITE_JPEG_QUALITY, 96]):
                raise OSError(f'Cannot write {stem}')
            lines = [f'0 {(x1+x2)/(2*w):.8f} {(y1+y2)/(2*h):.8f} {(x2-x1)/w:.8f} {(y2-y1)/h:.8f}' for x1, y1, x2, y2 in boxes]
            (DATA / 'labels/train' / f'{stem}.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    images = list((DATA / 'images/train').glob('*.jpg'))
    labels = list((DATA / 'labels/train').glob('*.txt'))
    assert len(images) == len(labels) == 100
    (DATA / 'dataset.yaml').write_text(yaml.safe_dump({'path': DATA.as_posix(), 'train': 'images/train', 'val': 'images/train', 'names': {0: 'empty_slot'}}, sort_keys=False), encoding='utf-8')
    print('100 images, including 48 original-photo versions, boxes:', sum(len(p.read_text().splitlines()) for p in labels))


if __name__ == '__main__':
    main()
