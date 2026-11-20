# Qwen-VL Provider 接口预留说明

本项目保留一个可配置的 Qwen-VL 服务端 Provider，但当前不要求 API Key，也不宣称真实调用已经通过。

## 配置项

```env
QWEN_API_BASE_URL=
QWEN_API_KEY=
QWEN_MODEL=
QWEN_API_PROTOCOL=openai-compatible
QWEN_TIMEOUT_MS=90000
```

不要把 Base URL 写死为某个通用地址。阿里云百炼的 OpenAI-compatible Base URL 会因地域、Workspace 而变化；以用户控制台提供的 URL 为准。若使用其他服务商的 Qwen API，也以该服务商提供的兼容端点为准。

## OpenAI-compatible 协议

请求目标：

```http
POST {QWEN_API_BASE_URL}/chat/completions
Authorization: Bearer {QWEN_API_KEY}
Content-Type: application/json
```

请求消息应包含 text 与 image_url 多模态内容。图片由 Next.js 服务端读取上传文件后转换为 data URL，不得把 QWEN_API_KEY 发送给浏览器。

## DashScope 原生协议

如果未来用户提供 DashScope 原生接口，必须实现独立的协议适配层。不要把 DashScope 原生 URL 误拼成 OpenAI-compatible `/chat/completions`。

## 本次完成标准

- Qwen Provider 类存在并实现统一 `VisionProvider` 接口。
- 缺少任一必需环境变量时 `isConfigured()` 返回 false。
- UI 显示“Qwen 接口未配置”。
- API 返回明确 `PROVIDER_NOT_CONFIGURED`。
- 不自动回退 Mock。
- 配置完整时可执行真实调用；但本次没有 Key 时不进行成功验收。

## 官方资料

- OpenAI-compatible Chat：<https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions>
- Qwen-VL OpenAI Vision：<https://help.aliyun.com/zh/model-studio/qwen-vl-compatible-with-openai>
