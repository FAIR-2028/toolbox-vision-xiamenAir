from pathlib import Path
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]

if __name__ == '__main__':
    model = YOLO(str(ROOT / 'data/real_yolo/runs/photo-fit/weights/last.pt'))
    model.train(
        data=str(ROOT / 'data/real_yolo/dataset.yaml'),
        epochs=300,
        resume=True,
        imgsz=960,
        batch=8,
        device=0,
        workers=0,
        seed=42,
        deterministic=True,
        project=str(ROOT / 'data/real_yolo/runs'),
        name='photo-fit',
        exist_ok=True,
        patience=100,
        optimizer='AdamW',
        lr0=0.001,
        degrees=2,
        translate=0.02,
        scale=0.08,
        fliplr=0.0,
        mosaic=0.0,
        close_mosaic=0,
    )
