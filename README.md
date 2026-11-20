# 工具盒视觉盘点工作台

根目录只保留本说明文件，其余内容按目录分类。

## 目录

- `project/`：完整 Next.js 项目、源码、依赖、配置及原项目说明。
- `archive/`：历史源码备份。
- `logs/`：原根目录的运行日志。
- `docs/`：迁移时仍被其他会话占用的验收记录；其他项目资料已随项目迁入 `project/docs/`。

## 启动

双击 `project/start-demo.cmd`。启动后访问 http://127.0.0.1:3002。

命令行开发：

```powershell
cd E:\toolbox-vision-demo\project
npm run dev -- --port 3003
```

重新构建生产版本：

```powershell
cd E:\toolbox-vision-demo\project
npm run build
```

Docker 命令也应在 `project/` 内运行。不要在外层根目录执行 npm 命令。

## 当前状态

演示页面与 Mock 后端已具备；真实视觉识别、真实照片验证和完整部署验收尚未完成。本次整理停止了项目预览服务，未自动重启。旧构建产物保留，但移动目录后建议重新构建再使用生产版。原文档中的旧绝对路径应按新的 `project/` 位置理解。
