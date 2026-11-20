# Pi Herdr 只读审查

范围：用户授权的四个指定源码文件；Pi 无写入工具。以下为审查意见，尚未直接采纳修改。

只读审查完成。以下问题都可由指定文件直接复现或确认：

- **上传体积限制可被绕过，且请求体在校验前已解析。** [app/api/analyze/route.ts](/E:/toolbox-vision-demo/app/api/analyze/route.ts)：代码先检查 `Content-Length`，随后调用 `req.formData()`，再检查文件大小。分块请求或缺少 `Content-Length` 时，首个限制不生效；服务端在文件大小校验前就会解析并缓冲请求体，可能造成过量内存或 CPU 消耗。建议在读取请求体前可靠限制总请求字节数，或使用有明确大小上限的流式 multipart 解析器；同时保留文件大小校验。

- **上传尺寸信息只做了解码检查，未保证符合 Mock 框坐标范围。** [lib/mock.ts](/E:/toolbox-vision-demo/lib/mock.ts)：Mock 检测框坐标固定在约 `x=140..840`、`y=85..885`；而 [app/api/analyze/route.ts](/E:/toolbox-vision-demo/app/api/analyze/route.ts) 接受宽高小于这些坐标的有效图片。此时响应中的检测框可能超出图片边界。建议按实际图片尺寸生成、缩放或裁剪框，并在输出前验证框坐标。

- **Docker 构建结果依赖未固定的基础镜像版本。** [Dockerfile](/E:/toolbox-vision-demo/Dockerfile)：三个阶段均使用可变标签 `node:22-bookworm-slim`，镜像上游更新后，同一 Dockerfile 和锁文件可能构建出不同环境。建议固定 Node 镜像到具体补丁版本，发布流程要求可复现时再固定镜像 digest。

- **Standalone 准备脚本对 Windows 和 Docker Linux 的 Sharp 依赖处理不一致。** [scripts/prepare-standalone.mjs](/E:/toolbox-vision-demo/scripts/prepare-standalone.mjs)：仅在 `win32` 时复制 Windows Sharp 二进制；[Dockerfile](/E:/toolbox-vision-demo/Dockerfile) 则在 Linux 容器中直接运行 `npm run build`，并未执行该准备脚本。若构建输出的 standalone 目录未包含 Linux Sharp 原生依赖，容器运行时 `import sharp` 会失败；这四个文件不足以确认该目录是否确实缺少依赖，因此这是需验证的部署风险，不是已确认故障。建议在 Linux 容器构建后检查 standalone 中 Sharp 的平台二进制及运行时加载，并确保准备步骤与目标平台一致。

在限定的四个文件中，未发现足够依据确认 Mock 场景统计与配置数据不一致；本次未读取配置文件。