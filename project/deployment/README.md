# Docker 参考文件

本目录提供 Docker / Next.js 部署参考模板：

-   `Dockerfile.example` -\> 项目根目录 `Dockerfile`
-   `docker-compose.example.yml` -\> 项目根目录 `docker-compose.yml`
-   `next.config.example.ts` -\> 合并到项目根目录 `next.config.ts`
-   `.dockerignore.example` -\> 项目根目录 `.dockerignore`
-   根目录 `.env.example` 已提供环境变量模板

这些是参考模板，不是已经构建好的应用镜像。Codex 必须根据实际生成的
`package.json`、Next.js 配置和构建结果验证并调整。

开发机上的 Pi、Magpie、Herdr TUI 不安装进 Docker 容器。Docker
容器只运行网页应用；网页后端在 Qwen 模式下直接读取服务端环境变量调用
Qwen-VL API。
