<div align="center">

# Toolbox Vision

**机务工具盒视觉盘点演示系统**

面向两套混合使用的小工具箱，使用一个 YOLO 模型检测小工具空槽，并演示现场告警与复核流程。

[Docker 启动](#docker-启动) · [项目需求](#项目原始需求) · [当前能力](#当前能力) · [实现路线](#实现路线)

</div>

---

## 项目原始需求

建设机务工具借还与归还检查演示系统，目标包括：

- 上传工具盒照片，识别小工具空槽并在图片上显示候选框。
- 两套小工具箱混合使用，由**一个 YOLO 模型**统一检测。
- 在界面模拟 RFID 大工具状态和相关告警，展示业务联动方式。
- 使用图像质量算法和机器视觉方法检查照片，质量需要改善时提示重新拍摄。
- 提供检测人员、检测时间、告警处理和历史查询等现场操作界面。
- 将模型推理适配器和网页服务部署到已有 Jetson Xavier NX 环境。

## 当前能力

| 模块 | 当前能力 |
| --- | --- |
| 图片检测 | 上传照片并显示 YOLO 空槽候选框与置信度，支持人工确认 |
| 模型 | 提供 YOLO11n 训练权重和 ONNX 部署模型 |
| 训练数据 | 100 张增强训练图片及对应 YOLO 标注，来源为 8 张标注实拍图 |
| 本地部署 | Docker 中使用 ONNX Runtime CPU 运行 |
| 图像质量检查 | 计划采用现成图像质量评价算法和机器视觉特征 |
| RFID 与告警 | 计划在前端使用模拟状态演示大工具告警流程 |
| 现场业务记录 | 计划增加人员登记、时间戳、告警处置和历史查询 |
| Jetson Xavier NX | 计划完成模型格式转换、推理适配器和网页部署 |

现有训练图来自少量实拍来源及增强数据，当前模型适用于对应工具盒的定向演示。

## Docker 启动

安装并启动 Docker Desktop，在仓库根目录运行：

```sh
cd project
docker compose up --build -d
```

打开 [http://127.0.0.1:3000/inspection.html](http://127.0.0.1:3000/inspection.html)。容器使用 ONNX Runtime CPU。停止服务：

```sh
docker compose down
```

## Windows 本地启动

安装 Node.js 22 和 Python 3.11，运行 `project/start-demo.cmd`，然后访问 [http://127.0.0.1:3002/inspection.html](http://127.0.0.1:3002/inspection.html)。启动脚本会准备 CPU 推理环境、安装依赖，并在需要时构建项目。

## 使用流程

1. 上传 JPG、PNG 或 WEBP 工具盒照片，单张图片上限为 7 MiB。
2. 等待本地 ONNX 模型完成空槽检测。
3. 查看图片上的候选框和置信度，由现场人员确认结果。

## 项目结构

```text
project/
├── app/api/                       # 检测与健康检查 API
├── public/inspection.html         # 图片上传与检测页面
├── models/                        # ONNX 模型与 YOLO 训练权重
├── data/real_yolo_100_originals/  # 训练图、YOLO 标注和数据配置
├── scripts/                       # 数据准备、训练和推理脚本
├── Dockerfile
└── docker-compose.yml

docs/                              # 项目实施计划
```

## 开发与检查

在 `project/` 目录执行：

```sh
npm ci
npm run typecheck
npm test
```

构建和启动服务：

```sh
npm run build
npm start
```

测试默认连接 `http://127.0.0.1:3002`，可通过 `TEST_BASE_URL` 指定服务地址。

## 实现路线

后续目标、前端优化方向、RFID 模拟、图像质量检查和 Jetson 部署安排见[机务工具视觉检测改造计划](docs/机务工具视觉检测改造计划.md)。
