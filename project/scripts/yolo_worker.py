import json
import os
import sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(os.environ.get('YOLO_MODEL_PATH', ROOT / 'models' / 'empty-slot-yolo11n.onnx'))
IMAGE_SIZE = 960
CONFIDENCE = float(os.environ.get('YOLO_CONFIDENCE', '0.25'))
PREFERRED_BACKEND = os.environ.get('YOLO_BACKEND', 'auto').lower()

available = ort.get_available_providers()
if PREFERRED_BACKEND in {'cuda', 'gpu'} and 'CUDAExecutionProvider' in available:
    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
elif PREFERRED_BACKEND in {'cpu', 'onnx'}:
    providers = ['CPUExecutionProvider']
elif 'CUDAExecutionProvider' in available:
    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
else:
    providers = ['CPUExecutionProvider']

SESSION = ort.InferenceSession(str(MODEL_PATH), providers=providers)
INPUT_NAME = SESSION.get_inputs()[0].name
ACTIVE_PROVIDER = SESSION.get_providers()[0]


def letterbox(image):
    height, width = image.shape[:2]
    scale = min(IMAGE_SIZE / width, IMAGE_SIZE / height)
    resized_width = round(width * scale)
    resized_height = round(height * scale)
    resized = cv2.resize(image, (resized_width, resized_height), interpolation=cv2.INTER_LINEAR)
    canvas = np.full((IMAGE_SIZE, IMAGE_SIZE, 3), 114, dtype=np.uint8)
    left = (IMAGE_SIZE - resized_width) // 2
    top = (IMAGE_SIZE - resized_height) // 2
    canvas[top:top + resized_height, left:left + resized_width] = resized
    return canvas, scale, left, top


def infer(image_hex):
    encoded = np.frombuffer(bytes.fromhex(image_hex), dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('invalid image')
    original_height, original_width = image.shape[:2]
    canvas, scale, left, top = letterbox(image)
    tensor = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).transpose(2, 0, 1)[None].astype(np.float32) / 255.0
    output = SESSION.run(None, {INPUT_NAME: tensor})[0]
    detections = np.asarray(output).reshape(-1, 6)
    boxes = []
    for x1, y1, x2, y2, confidence, _class_id in detections:
        if confidence < CONFIDENCE:
            continue
        x1 = max(0.0, min(original_width, (x1 - left) / scale))
        y1 = max(0.0, min(original_height, (y1 - top) / scale))
        x2 = max(0.0, min(original_width, (x2 - left) / scale))
        y2 = max(0.0, min(original_height, (y2 - top) / scale))
        if x2 <= x1 or y2 <= y1:
            continue
        boxes.append({
            'bbox': [round(float(x1 / original_width * 1000), 2), round(float(y1 / original_height * 1000), 2), round(float(x2 / original_width * 1000), 2), round(float(y2 / original_height * 1000), 2)],
            'confidence': round(float(confidence), 4),
        })
    return {'image': {'width': original_width, 'height': original_height}, 'emptySlots': boxes, 'backend': 'onnx', 'provider': ACTIVE_PROVIDER}


print(json.dumps({'ready': True, 'model': str(MODEL_PATH), 'backend': 'onnx', 'provider': ACTIVE_PROVIDER}), flush=True)
for line in sys.stdin:
    request = {}
    try:
        request = json.loads(line)
        print(json.dumps({'id': request.get('id'), 'result': infer(request['imageHex'])}), flush=True)
    except Exception as error:
        print(json.dumps({'id': request.get('id'), 'error': str(error)}), flush=True)
