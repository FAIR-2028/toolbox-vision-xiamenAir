# Codex 项目启动入口（从只有 Codex 开始）

你目前只有 Codex。不要假设 Pi、Magpie、Herdr、Docker 已安装。

## 必须先读的文件

1.  `BOOTSTRAP_FROM_CODEX_ONLY_CN.md`：从现有 Codex 开始，完整安装
    Pi、Magpie、Herdr TUI、Docker 并配置它们。
2.  `docs/PROJECT_SPEC_CN.md`：本项目完整需求和技术实施规格。
3.  `config/tool_inventory.json`：工具标准清单（数量暂定）。
4.  `config/mock_scenarios.json`：Mock 演示结果。
5.  `samples/README.md`：样例图片来源和使用限制。
6.  `deployment/README.md`：Docker 模板说明。

## 执行顺序

### 第 1 阶段：开发机初始化（必须先做）

严格按 `BOOTSTRAP_FROM_CODEX_ONLY_CN.md` 执行：

1.  检查操作系统、当前 Codex 是桌面版还是 CLI。
2.  确保终端可以运行 `codex`；如只有桌面版，按指南安装 Codex
    CLI，不卸载桌面版。
3.  安装 Pi。
4.  安装 Magpie，添加用户有权使用的 Provider，分别为 Codex / Pi
    选择模型。
5.  安装 Herdr TUI，执行 `herdr integration install codex` 和
    `herdr integration install pi`。
6.  检查 Docker / Docker Compose。
7.  验证全部命令和集成状态。

先检查和备份配置，再修改。登录、账号授权、密码和 API Key
输入必须由用户本人完成。

### 第 2 阶段：项目开发

开发机初始化完成后，再按 `docs/PROJECT_SPEC_CN.md` 的 Phase 0--6 实施：

-   Codex 是唯一主开发 / 代码写入 Agent。
-   Pi 默认只读审查，不与 Codex 同时改同一批文件。
-   Magpie 负责开发 Agent 的模型 Provider 与模型切换。
-   Herdr TUI 负责终端 Pane / 会话管理。
-   Qwen-VL 是网页后端的视觉模型；用户后续提供 Base URL、Model、API
    Key。
-   先完成无 API Key 的 Mock Demo，再接真实 Qwen API。
-   必须实现 Docker Compose 一键启动。

## 不可违反的要求

1.  不得假设任何工具已经安装；先运行检查命令。
2.  不得把 API Key 写进前端、源码、日志、Git 或聊天内容。
3.  不得把 Magpie Gateway 当作 Docker 后端的默认 Qwen API。
4.  不得把合成缺失图片当作真实准确率测试数据。
5.  不得把暂定工具数量包装成正式盘点标准。
6.  每阶段必须运行测试，并给出真实命令输出 / 结果。
7.  如果遇到权限、登录、账号授权、API Key
    输入等步骤，暂停并请用户本人操作。
8.  如果某个工具安装失败，说明原因和可选下一步，不得声称已经配置成功。

## 第一轮 Codex 任务

请先完整阅读上述文件，然后执行开发机环境检查。先给我一份表格，列出 Codex
CLI、Pi、Magpie、Herdr TUI、Docker / Docker Compose
的状态。缺少的按初始化指南逐个安装；完成后再进入项目开发。不要先写业务代码，也不要等待
Qwen API。
