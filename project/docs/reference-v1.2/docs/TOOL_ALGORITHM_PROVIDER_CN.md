# 工具识别算法 Provider 接口预留说明

本项目不预设算法品牌或技术栈。未来可接 YOLO、RT-DETR、ONNX Runtime、TensorRT 或自研模型服务。

## 环境变量

```env
TOOL_ALGORITHM_BASE_URL=
TOOL_ALGORITHM_API_KEY=
TOOL_ALGORITHM_PREDICT_PATH=/predict
TOOL_ALGORITHM_HEALTH_PATH=/health
TOOL_ALGORITHM_TIMEOUT_MS=90000
```

## 约定

- `GET /health`：健康检查，返回 `{"status":"ok","version":"..."}`。
- `POST /predict`：multipart 上传图片，另带 `inventory`、`requestId`、`coordinateSystem`。
- 统一输出 `normalized_0_1000` 坐标。
- `detections` 表示图像中真实可见的实体。
- `emptySlots` 表示算法有证据定位的空槽位，不能根据标准数量反推坐标。
- `uncertainRegions` 表示遮挡、反光或模糊等需人工复核区域。
- 服务错误、超时、JSON 不合规、bbox 越界必须返回可读错误。

完整接口定义见 `contracts/tool-algorithm-api.openapi.yaml`。
