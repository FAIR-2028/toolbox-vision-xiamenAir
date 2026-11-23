from pathlib import Path
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]

if __name__ == '__main__':
    model = YOLO(str(ROOT / 'data/real_yolo/runs/photo-fit/weights/best.pt'))
    model.train(
        data=str(ROOT / 'data/real_yolo_100/dataset.yaml'),
        epochs=50, imgsz=960, batch=8, device=0, workers=0,
        seed=42, deterministic=True, optimizer='AdamW', lr0=0.0005,
        project=str(ROOT / 'data/real_yolo_100/runs'), name='photo-fit-50',
        exist_ok=False, patience=50, degrees=2, translate=0.02,
        scale=0.08, fliplr=0.0, mosaic=0.0,
    )
