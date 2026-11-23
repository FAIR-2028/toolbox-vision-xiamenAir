import json
import sys
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
WEIGHTS = ROOT / 'models' / 'empty-slot-yolo11n.pt''
MODEL = YOLO(str(WEIGHTS))

# Load CUDA kernels and keep the model resident before accepting uploads.
WARMUP = np.zeros((640, 640, 3), dtype=np.uint8)
MODEL.predict(WARMUP, imgsz=960, conf=0.25, device=0, verbose=False)
print(json.dumps({'ready': True, 'model': str(WEIGHTS), 'device': 'cuda:0'}), flush=True)


def infer(image_hex: str):
    encoded = np.frombuffer(bytes.fromhex(image_hex), dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('invalid image')
    result = MODEL.predict(image, imgsz=960, conf=0.25, device=0, verbose=False)[0]
    boxes = []
    if result.boxes is not None:
        for box, score in zip(result.boxes.xyxy.cpu().tolist(), result.boxes.conf.cpu().tolist()):
            x1, y1, x2, y2 = box
            boxes.append({
                'bbox': [
                    round(max(0, min(1000, x1 / image.shape[1] * 1000)), 2),
                    round(max(0, min(1000, y1 / image.shape[0] * 1000)), 2),
                    round(max(0, min(1000, x2 / image.shape[1] * 1000)), 2),
                    round(max(0, min(1000, y2 / image.shape[0] * 1000)), 2),
                ],
                'confidence': round(float(score), 4),
            })
    return {'image': {'width': image.shape[1], 'height': image.shape[0]}, 'emptySlots': boxes}


for line in sys.stdin:
    try:
        request = json.loads(line)
        print(json.dumps({'id': request.get('id'), 'result': infer(request['imageHex'])}), flush=True)
    except Exception as error:
        print(json.dumps({'id': request.get('id') if 'request' in locals() else None, 'error': str(error)}), flush=True)
