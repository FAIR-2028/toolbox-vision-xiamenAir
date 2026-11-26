# 工具盒视觉盘点工作台

上传 JPG、PNG 或 WEBP 工具盒照片，系统通过本地 YOLO11n ONNX 模型标出疑似空槽，结果由现场人员复核。模型针对 8 张标注实拍图及其增强数据训练，适用于该工具盒的定向演示。

## Docker 一键启动

安装并启动 Docker Desktop，在本目录执行：

```sh
docker compose up --build -d
```

访问 http://127.0.0.1:3000/inspection.html。容器使用 ONNX Runtime CPU，不要求显卡、CUDA 或宿主机安装 Python 和 Node.js。首次构建需要网络下载依赖。

如果 3000 端口被占用，可设置 `TOOLBOX_PORT`。例如 PowerShell：

```powershell
$env:TOOLBOX_PORT = '3004'
docker compose up --build -d
```

查看日志和停止服务：

```sh
docker compose logs -f web
docker compose down
```

端口仅绑定本机回环地址。`/api/health` 检查 Web 服务状态，实际模型可用性以图片上传识别结果为准。

## Windows 本地启动

安装 Node.js 22 和 Python 3.11，双击本目录的 `start-demo.cmd`，然后访问 http://127.0.0.1:3002/inspection.html。脚本在缺少 `.venv-yolo` 时创建虚拟环境并安装 `requirements-onnx.txt`，安装 Node 依赖并在缺少构建产物时构建。已有环境缺少依赖时，请手动运行：

```bat
.venv-yolo\Scripts\python.exe -m pip install -r requirements-onnx.txt
```

源码更新后，请先停止本项目的旧服务，再执行 `npm run build` 和 `start-demo.cmd`。Windows 上运行中的服务可能占用 Sharp DLL。

Linux/macOS 本地运行可创建 `.venv-yolo`，安装 `requirements-onnx.txt`，再执行 `npm ci`、`npm run build` 和 `PORT=3002 npm start`。可使用 `YOLO_PYTHON` 指定 Python 解释器路径，`YOLO_PROJECT_ROOT` 指定项目目录。

## 识别与模型

- 网页支持文件选择、拖拽上传、自动检测和重新检测，红框代表待人工确认的空槽候选。
- 默认上传限制为 7 MiB。服务端检查文件类型、解码图片并处理方向后再进行推理。
- `models/empty-slot-yolo11n.onnx` 是部署模型，`models/empty-slot-yolo11n.pt` 是训练权重。
- ONNX worker 在进程内复用会话。默认自动选择可用的 CUDA provider 或 CPU provider，`YOLO_BACKEND=cpu` 可指定 CPU。Docker 配置使用 CPU。安装 CUDA provider 及其兼容依赖需另行配置。
- 本模型检测空槽候选，不识别具体缺失工具类别。训练集和评估数据高度相关，当前结果不代表对其他工具盒或现场环境的泛化准确率。
- 最新训练集位于 `data/real_yolo_100_originals/`，含 98 张增强图和对应 YOLO 标注。训练入口为 `scripts/train_real_yolo_originals.py`。原始实拍图位于仓库根目录的 `datasets/`。

## 检查和测试

启动服务后，在本目录执行：

```sh
npm run typecheck
npm test
```

测试默认连接 `http://127.0.0.1:3002`，可通过 `TEST_BASE_URL` 指定其他服务地址。部分实拍回归测试需要本地标注图片，完整数据准备及历史实验文件不在 Docker 运行镜像中。

主要文件包括 `public/inspection.html`、`app/api/analyze/route.ts`、`scripts/yolo_worker.py`、`Dockerfile` 和 `docker-compose.yml`。
