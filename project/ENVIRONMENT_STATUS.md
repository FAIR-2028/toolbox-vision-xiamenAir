# 开发环境初始化记录

状态：进行中，尚未完成完整环境验收，业务开发尚未开始。

| 项目 | 已验证状态 |
|---|---|
| Windows | Windows 11 家庭中文版 10.0.26200，x64，HypervisorPresent=True |
| Codex CLI | 0.156.1，保留原安装；主模型字段已设为 codex/gpt-6.2-sol，新 Codex 会话请求待验证 |
| Node/npm | 官方安装 26.13.1 / 11.20.0，命令验证通过 |
| Pi | 1.5.2，命令验证通过；通过 Magpie 模型请求返回 PI_MODEL_OK |
| Magpie | 官方 v0.1.4595 程序和 CLI，SHA-256 校验通过；运行中 |
| 模型 | Magpie 识别现有 Codex 来源，无需当前输入 API Key；Pi 使用 magpie/codex/gpt-6.2-sol |
| Herdr TUI | 0.9.5，版本验证通过；Codex current(v10)、Pi current(v9) |
| WSL | Microsoft.WSL 3.0.5 安装失败：0x80073d28，需要管理员权限；后续 UAC 操作被用户取消，等待用户本人完成管理员安装 |
| Docker | Docker Desktop 4.99.0 官方安装包下载中；Compose/Engine 未验证 |
| 三个 Pane | 尚未建立；当前聊天不在 Herdr 内，技能禁止从外部控制会话 |

Codex 配置修改前已创建本地时间戳备份。未输出认证内容，未配置 Qwen Key。

待办：完成 WSL/Docker 安装及 Engine 验证；建立 Codex、只读 Pi、Docker 日志 Pane；开发 Next.js Mock Demo；单元测试、构建、API 与浏览器验收、Docker 一键启动验证、Pi 审查、交付 README 和测试报告。

用户已确认：保持先环境后开发，等待本人完成管理员 WSL 安装后继续。

