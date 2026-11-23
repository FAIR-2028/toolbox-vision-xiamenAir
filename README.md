# 工具盒视觉盘点工作台

上传工具盒照片，通过本地 ONNX 模型标出疑似空槽，供现场人员复核。模型针对仓库中的实拍照片训练，适合当前工具盒的定向演示。

## Docker 启动

安装并启动 Docker Desktop，然后在仓库根目录运行：

```sh
cd project
docker compose up --build -d
```

访问 http://127.0.0.1:3000/inspection.html。更多启动、测试、模型和数据集说明见 [项目 README](project/README.md)。

Windows 用户也可以运行 `project/start-demo.cmd`，本地服务默认使用 3002 端口。
