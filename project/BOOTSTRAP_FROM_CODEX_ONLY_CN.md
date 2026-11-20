# 从"只有 Codex"开始：Pi + Magpie + Herdr 完整环境初始化指南

**适用状态：** 目前电脑上只有 Codex；Pi、Magpie、Herdr
尚未安装或尚未配置。\
**目标：** 从现有 Codex 出发，完成本机 AI Coding
工具链安装、模型接入、终端协作和 Docker 开发环境准备。\
**适用系统：** Windows 10/11、macOS、Linux。Codex
必须能访问本地项目目录。

> 本文选择的是 **Herdr TUI（终端多 Pane 版本）**，不是另一个独立的 Herdr
> 桌面 App。选择 TUI 是为了在同一个终端工作区里运行 Codex、Pi 和 Docker
> 日志，并安装 `herdr integration install ...` 集成。

------------------------------------------------------------------------

## 一、先理解最终会搭成什么

  工具             在本项目中的职责                                       是否是网页运行依赖
  ---------------- ------------------------------------------------------ ----------------------
  Codex            主开发 Agent：创建代码、实现功能、运行测试、修复问题   否
  Pi               辅助 Agent：只读代码审查、Prompt 审查、测试遗漏检查    否
  Magpie           本机模型网关：给 Codex / Pi 选择和切换模型供应商       否
  Herdr TUI        终端工作区：管理 Codex、Pi、日志等多个 Pane 和会话     否
  Qwen-VL API      网页后端实际调用的视觉模型                             是，仅真实 Qwen 模式
  Docker Compose   一键启动网页 Demo                                      本地演示时需要

**关键区别：**

1.  Pi、Magpie、Herdr 是你电脑上的开发工具，不安装在项目 Docker 容器里。
2.  Magpie 的本地 Gateway 默认地址为 `127.0.0.1:3425`，供 Codex / Pi
    等开发 Agent 使用。
3.  网页后端调用 Qwen-VL 时，默认直接使用你之后提供的 Qwen API Base
    URL、模型名和 API Key；不要默认让 Docker 容器依赖宿主机上的 Magpie
    Gateway。
4.  现在没有 Qwen API Key 不影响开发。先完成 Mock 模式和 Docker
    网页演示。

## 二、总体安装顺序

请严格按下面顺序执行，不要假设 Pi、Magpie、Herdr 已经存在：

1.  检查当前 Codex 是桌面版、CLI，还是两者都有。
2.  确保本机可以从终端运行 `codex`（Herdr 需要调用 Codex CLI）。
3.  安装 Pi。
4.  安装 Magpie，添加至少一个你有权使用的模型 Provider，并分别给
    Codex、Pi 选择模型。
5.  安装 Herdr TUI，安装 Codex 和 Pi 集成。
6.  检查 Docker / Docker Compose。
7.  在 Herdr 中打开项目工作区，运行 Codex、Pi 和 Docker 日志。
8.  再开始实现工具盒识别 Demo。

Codex
必须先做环境检查和备份，再进行配置修改。任何需要浏览器登录、账号授权、输入密码或
API Key 的步骤，都暂停并请用户本人完成。

------------------------------------------------------------------------

## 三、阶段 0：从当前 Codex 环境开始检查

### 0.1 打开项目目录

1.  解压 `toolbox_vision_demo_codex_package_v0.3.zip`。
2.  在 Codex 中打开解压后的 `toolbox_vision_demo_codex_package` 文件夹。
3.  确认 Codex
    能读取本文件、`CODEX_START_HERE.md`、`docs/PROJECT_SPEC_CN.md`、`config/`
    和 `samples/`。

### 0.2 检查操作系统和命令

**Windows PowerShell：**

``` powershell
$PSVersionTable.PSVersion
Get-Command codex,node,npm,docker,pi,magpie,herdr -ErrorAction SilentlyContinue |
  Format-Table Name, Source -AutoSize

if (Get-Command codex -ErrorAction SilentlyContinue) { codex --version }
if (Get-Command node -ErrorAction SilentlyContinue) { node --version }
if (Get-Command npm -ErrorAction SilentlyContinue) { npm --version }
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker --version
  docker compose version
}
```

**macOS / Linux：**

``` bash
uname -a
for cmd in codex node npm docker pi magpie herdr; do
  if command -v "$cmd" >/dev/null 2>&1; then
    printf "%-10s %s\n" "$cmd" "$(command -v "$cmd")"
  else
    printf "%-10s NOT_FOUND\n" "$cmd"
  fi
done

codex --version 2>/dev/null || true
node --version 2>/dev/null || true
npm --version 2>/dev/null || true
docker --version 2>/dev/null || true
docker compose version 2>/dev/null || true
```

只输出版本、命令路径和可用状态，不要输出环境变量值、密钥或配置文件里的认证内容。

### 0.3 区分 Codex 桌面版和 Codex CLI

Herdr TUI 需要在 Pane 中运行终端命令 `codex`。仅能在桌面 App
里聊天，不代表终端里已经有 `codex` 命令。

-   如果 `codex --version` 成功：说明 Codex CLI 已可用，跳过安装。
-   如果命令不存在，但你已经安装 Codex 桌面 App：保留桌面
    App，不要卸载；继续安装 Codex CLI，让 Herdr 能从终端启动 Codex。
-   如果 Codex CLI 已安装但尚未登录：在终端运行
    `codex`，按提示通过浏览器完成登录。
-   如果 `node` / `npm` 不存在：先让用户安装 Node.js
    LTS，再继续；不要猜测或下载来历不明的安装包。

**安装 Codex CLI（仅在 `codex` 命令不存在时）：**

先检查 Node.js 和 npm。如果两者可用：

``` bash
npm install -g @openai/codex@latest
codex --version
codex
```

Windows PowerShell 也使用相同的 npm 命令：

``` powershell
npm install -g @openai/codex@latest
codex --version
codex
```

首次运行时按提示完成登录。不要把 ChatGPT
密码、登录验证码或任何访问令牌发给 Codex 对话。

官方参考： - Codex CLI 项目：<https://github.com/openai/codex> - Codex
CLI
安装示例：<https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex>

### 0.4 备份现有 Codex 配置

Magpie 会在你明确选择模型后更新 Codex 的模型 Provider 配置；Herdr 安装
Codex 集成时会写入 Hooks 配置。因此必须先备份，不能直接覆盖现有配置。

**Windows PowerShell：**

``` powershell
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

if (Test-Path (Join-Path $codexHome "config.toml")) {
  Copy-Item (Join-Path $codexHome "config.toml") (Join-Path $codexHome "config.toml.backup-$stamp")
}
if (Test-Path (Join-Path $codexHome "hooks.json")) {
  Copy-Item (Join-Path $codexHome "hooks.json") (Join-Path $codexHome "hooks.json.backup-$stamp")
}
```

**macOS / Linux：**

``` bash
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
STAMP="$(date +%Y%m%d-%H%M%S)"
[ -f "$CODEX_DIR/config.toml" ] && cp "$CODEX_DIR/config.toml" "$CODEX_DIR/config.toml.backup-$STAMP"
[ -f "$CODEX_DIR/hooks.json" ] && cp "$CODEX_DIR/hooks.json" "$CODEX_DIR/hooks.json.backup-$STAMP"
```

只备份本地文件，不要把配置文件内容粘贴到聊天或提交到 Git。

------------------------------------------------------------------------

## 四、阶段 1：安装 Pi

Pi 是终端 AI Coding Agent。它在本项目中主要担任辅助审查角色，默认不与
Codex 同时编辑同一批文件。

### Windows PowerShell

``` powershell
irm https://pi.dev/install.ps1 | iex
pi --version
```

### macOS / Linux

``` bash
curl -fsSL https://pi.dev/install.sh | sh
pi --version
```

安装后确认 `pi --version`
有版本输出。如果系统提示命令不存在，重新打开终端并检查
PATH，不要重复安装多份。

Pi 官方安装器会处理其依赖。也可以使用 npm 安装，但官方文档要求 Node.js
22.19 或更新版本：

``` bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

先安装 Pi；模型登录和选择放到 Magpie 配置完成后处理。

官方文档：<https://docs.pi.dev/latest/quickstart>

------------------------------------------------------------------------

## 五、阶段 2：安装并配置 Magpie

Magpie 是模型 Provider 管理器和本地 Gateway。它不是模型本身。

### 5.1 安装 Magpie

**Windows：**

1.  打开官方主页：<https://usemagpie.ai/>
2.  选择 Windows 下载，按电脑架构选择 x64 或 ARM。
3.  安装并打开 Magpie。
4.  如果还需要终端 CLI，使用官方 Releases 页面提供的 Windows
    CLI；不要从第三方网站下载。

**macOS / Linux：**

``` bash
curl -fsSL https://usemagpie.ai/install.sh | sh
magpie --version
```

Linux 无桌面环境或只需要终端版时，官方安装器支持：

``` bash
curl -fsSL https://usemagpie.ai/install.sh | sh -s -- --tui
```

官方主页：<https://usemagpie.ai/>\
官方安装与模型配置：<https://usemagpie.ai/docs/start>\
中文说明：<https://usemagpie.ai/docs/zh/start>

### 5.2 添加模型 Provider

打开 Magpie 的 Providers 页面，点击 Add provider。

可选来源包括：

-   已支持的订阅登录。
-   你已经拥有 API Key 的模型供应商。
-   你自己的兼容 API Endpoint。
-   本机 Ollama / LM Studio 等本地模型服务。

**优先检查现有 Codex 登录是否可作为 Magpie Provider 使用：**

1.  在 Magpie 的 Providers 页面查看是否识别到本机已有的 Codex / ChatGPT
    登录。
2.  如果有，确认账号归属和可用模型后再选择。
3.  如果没有，使用 Magpie 明确支持且你有权使用的 Provider；需要登录或
    API Key 时由用户本人操作。
4.  不要假设"已经有
    Codex"就一定自动获得所有第三方模型，也不要擅自购买订阅或创建付费
    API。

当前没有 Qwen API Key 也可以先用你已有的其他 Provider 配置 Codex 和
Pi。Qwen API 后续再添加。

### 5.3 给 Codex 和 Pi 分别选择模型

1.  打开 Magpie 的 Agents 页面。
2.  找到 Codex，为 Codex 选择一个可用模型。
3.  找到 Pi，为 Pi 选择一个可用模型。
4.  保存设置。
5.  关闭并重新打开 Codex CLI 和 Pi，让新配置生效。

Magpie 的本地 Gateway 默认是：

``` text
http://127.0.0.1:3425
```

Magpie 会按 Agent 类型写入对应配置。Codex 的模型 Provider 配置通常写入
`~/.codex/config.toml`；Pi 使用自己的 Agent 配置。Magpie
文档说明它只修改自身管理的配置项，但仍建议在前面先备份 Codex 配置。

如果有 Magpie CLI，可运行：

``` bash
magpie providers
magpie models
magpie ls
```

如果 Windows 只安装了图形 App，先以 Magpie 界面显示的 Provider / Agent
状态为准，不要因 `magpie` 命令不在 PATH 就重复安装。

**安全说明：**

-   Magpie 保存的 Provider Key 属于 Magpie 自己的本地配置。
-   Magpie Provider Key 和后续网页 Demo 的 `QWEN_API_KEY`
    是两份用途不同的配置。
-   不要把任何 Key 发到 Codex 聊天、写进源码或提交到 Git。
-   如果 Magpie 没有你需要的 Provider，不要伪造模型名或 Endpoint。

------------------------------------------------------------------------

## 六、阶段 3：启动一次 Pi，确认模型可用

在项目目录打开终端，运行：

``` bash
pi
```

确认 Pi 能启动并看到已选择的模型。若 Magpie 已为 Pi 写入 Provider，按
Magpie 选择的模型运行；如果 Pi 未看到 Magpie 模型：

1.  退出 Pi。
2.  确认 Magpie 正在运行。
3.  确认 Magpie 的 Agents 页面里有 Pi 并已选模型。
4.  重新打开 Pi。
5.  仍不可用时，查看 Pi 和 Magpie 的官方文档，不要手工猜写配置。

如果决定不通过 Magpie，而让 Pi 直接使用 Provider，可在 Pi 中运行
`/login`，按 Pi 的交互完成 Provider 登录；但本项目优先采用 Magpie
统一管理 Codex / Pi 模型的方式，不要同时反复覆盖两套配置。

Pi 第一次启动后退出即可。这样也能确保 Pi 的 Agent
配置目录已经创建，供后续安装 Herdr Pi 集成。

------------------------------------------------------------------------

## 七、阶段 4：安装 Herdr TUI 并集成 Codex / Pi

### 7.1 明确安装的是 Herdr TUI

本项目使用 Herdr TUI（终端工作区 / Pane 管理器），对应官方文档：

<https://herdr.dev/tui/docs/install/>

不要把 Herdr TUI 与官网上另一个 Herdr 桌面 App 混淆。本项目需要 `herdr`
终端命令和 `herdr integration` 子命令。

### 7.2 安装 Herdr TUI

**Windows PowerShell：**

``` powershell
powershell -ExecutionPolicy Bypass -c "irm https://herdr.dev/install.ps1 | iex"
```

**macOS / Linux：**

``` bash
curl -fsSL https://herdr.dev/install.sh | sh
```

重新打开终端，运行：

``` bash
herdr
```

能进入 Herdr TUI 即表示基本安装成功。退出或 detach 后可以再次运行
`herdr` 重新连接。

官方安装文档：<https://herdr.dev/tui/docs/install/>\
官方快速上手：<https://herdr.dev/tui/docs/quick-start/>

### 7.3 安装 Codex 集成

Herdr 的 Codex 集成会在 Codex 配置目录写入 Hook 脚本、更新
`hooks.json`，并在 `config.toml` 中确保 Hooks
功能开启。因此必须先备份配置，并确认 Codex CLI 已经至少运行过一次。

``` bash
herdr integration install codex
```

### 7.4 安装 Pi 集成

Herdr 的 Pi 集成会向 Pi Agent 扩展目录写入状态扩展。先确认 Pi
已运行过一次并创建 Agent 目录，然后执行：

``` bash
herdr integration install pi
```

### 7.5 检查集成状态

``` bash
herdr integration status
```

确认 Codex 和 Pi 集成都已安装。若某项失败：

-   检查对应 CLI 是否能在当前终端运行。
-   检查 Codex 配置目录（默认 `~/.codex`，也可能由 `CODEX_HOME` 指定）。
-   检查 Pi Agent 目录（默认 `~/.pi/agent`，也可能由
    `PI_CODING_AGENT_DIR` 指定）。
-   不要覆盖或删除已有配置；先报告失败原因，再按官方文档处理。

Herdr 集成文档：<https://herdr.dev/tui/docs/integrations/>

**Windows 注意：** Herdr TUI 原生 Windows
支持已可用，但部分终端行为和中文输入法组合定位仍可能存在平台差异。若中文输入法在
Pane 内异常，先尝试更新 Herdr、Windows Terminal 或使用 WSL
工作环境；不要误判为项目代码故障。Windows
支持说明：<https://herdr.dev/tui/docs/windows-beta/>

------------------------------------------------------------------------

## 八、阶段 5：安装 / 检查 Docker

Docker 是本地一键启动网页 Demo 的必要条件，但不是 Pi / Magpie / Herdr
的安装依赖。

### Windows / macOS

安装 Docker Desktop：<https://docs.docker.com/get-started/get-docker/>

Windows 按 Docker 官方说明启用 WSL 2 后端。安装完成后启动 Docker
Desktop，等待 Engine 变为 Running。

### Linux

按发行版安装 Docker Engine 和 Docker Compose
Plugin，参考：<https://docs.docker.com/engine/install/>

### 验证

``` bash
docker --version
docker compose version
docker info
```

以上命令应成功。若 Docker 未安装或 Engine 未启动，Codex
必须明确报告，不要假装 Docker Demo 已经可运行。

------------------------------------------------------------------------

## 九、阶段 6：在 Herdr 中创建项目工作区

先在终端进入解压后的项目目录，再启动 Herdr：

``` bash
cd toolbox_vision_demo_codex_package
herdr
```

Herdr 会在没有 Workspace 时自动创建一个。建议使用三个 Pane：

  Pane   命令                           用途
  ------ ------------------------------ ------------------------
  A      `codex`                        主开发、唯一代码写入者
  B      `pi`                           辅助审查，默认只读
  C      `docker compose logs -f web`   观察网页容器日志

### 常用操作

Herdr 默认可用鼠标操作；也可使用键盘前缀：

-   `Ctrl+B`，再按 `v`：向右分割 Pane。
-   `Ctrl+B`，再按 `-`：向下分割 Pane。
-   `Ctrl+B`，再按 `c`：新建 Tab。
-   `Ctrl+B`，再按 `q`：detach，后台会话继续运行。
-   再次输入 `herdr`：重新连接原会话。

推荐布局：

1.  左侧大 Pane：Codex 主开发。
2.  右上 Pane：Pi 审查。
3.  右下 Pane：Docker 日志。

如果应用尚未启动，Pane C 的日志命令可能提示容器不存在；等 Codex 完成
Docker Compose 后再运行即可。

### Agent 协作约束

-   Codex 是唯一默认写入代码的 Agent。
-   Pi 负责审查，默认只读，不与 Codex 同时编辑同一文件。
-   Pi 的审查意见由 Codex 评估并执行修改。
-   若确实需要 Pi 写代码，先使用独立 Git 分支或 Worktree。
-   Herdr 负责管理 Pane 和会话，不替代 Codex / Pi 的模型能力。

------------------------------------------------------------------------

## 十、阶段 7：开始开发本项目

环境准备完成后，在 Codex Pane 中发送：

``` text
请先阅读：
1. CODEX_START_HERE.md
2. BOOTSTRAP_FROM_CODEX_ONLY_CN.md
3. docs/PROJECT_SPEC_CN.md
4. config/tool_inventory.json
5. config/mock_scenarios.json
6. samples/README.md
7. deployment/README.md

先输出环境检查结果，逐项确认：
- Codex CLI
- Pi
- Magpie（Provider、Codex 模型、Pi 模型）
- Herdr TUI（Codex / Pi integrations）
- Docker / Docker Compose

如果任何一项未完成，先解释缺项和下一步，不要假设已安装成功。
完成环境准备后，按 PROJECT_SPEC_CN.md 开始实现。

先做 Mock 模式和 Docker 一键启动，不等待 Qwen API。
Qwen API 的 Base URL、Model、API Key 由我后续提供。
不要把任何密钥写进源码、日志、前端或聊天内容。
Codex 是唯一代码写入者，Pi 先只读审查。
每个阶段都要实际运行命令和测试，以结果证明完成。
```

------------------------------------------------------------------------

## 十一、环境初始化验收清单

全部满足后，才算开发工具链准备完成：

-   [ ] `codex --version` 成功。
-   [ ] Codex CLI 已完成登录，可以在终端启动。
-   [ ] `pi --version` 成功，Pi 能启动并看到可用模型。
-   [ ] Magpie 已安装并运行。
-   [ ] Magpie 中至少有一个你授权使用的 Provider。
-   [ ] Magpie 已分别为 Codex 和 Pi 选择模型。
-   [ ] Codex / Pi 重启后能使用所选模型。
-   [ ] `herdr` 可以启动 Herdr TUI。
-   [ ] `herdr integration status` 显示 Codex 和 Pi 集成。
-   [ ] `docker --version` 成功。
-   [ ] `docker compose version` 成功。
-   [ ] Codex、Pi、日志三个 Pane 可以在 Herdr 工作区运行。

## 十二、常见问题和处理

  ------------------------------------------------------------------------
  现象                                处理
  ----------------------------------- ------------------------------------
  `codex` 命令找不到                  检查是否只安装桌面版；按需安装 Codex
                                      CLI，重启终端检查 PATH

  `pi` 命令找不到                     重新打开终端，检查官方安装器输出和
                                      PATH

  Magpie 中看不到 Codex / Pi          确认对应 CLI
                                      已安装并至少运行过一次；重启 Magpie

  切换模型后仍使用旧模型              关闭旧会话，重启 Codex / Pi；Codex
                                      桌面 App 也可能需要重启

  Herdr 找不到 Codex 配置目录         先运行一次 Codex；确认
                                      `CODEX_HOME`；再安装集成

  Herdr 找不到 Pi Agent 目录          先运行一次 Pi；再安装 Pi 集成

  Docker 命令存在但无法连接           启动 Docker Desktop / Docker
                                      Engine，再执行 `docker info`

  Windows 中文输入法在 Herdr Pane     查看 Herdr Windows
  异常                                支持说明，更新终端 /
                                      Herdr，必要时尝试 WSL
  ------------------------------------------------------------------------

## 十三、配置与密钥安全

1.  不要把 Qwen API Key、Magpie Provider Key、登录令牌发到 Codex 对话。
2.  Magpie 的模型供应商 Key 在 Magpie 自己的 Provider 设置中添加。
3.  网页后端的 Qwen API Key 后续只写到项目本地 `.env`，不写入源码。
4.  `.env` 必须加入 `.gitignore`。
5.  不得在前端使用 `NEXT_PUBLIC_QWEN_API_KEY`。
6.  安装 Magpie / Herdr 前后都不要删除现有 Codex 配置。
7.  如果 Magpie 或 Herdr
    修改配置，保留此前备份；出现问题先回滚备份，不要盲目重装。
8.  Codex
    执行安装命令、修改配置或启动服务前，遵循当前运行环境的权限确认机制；遇到系统登录、授权、密码输入时交给用户本人。

------------------------------------------------------------------------

## 十四、官方资料（以最新官方文档为准）

-   Pi Quickstart：<https://docs.pi.dev/latest/quickstart>
-   Magpie 官网 / 下载：<https://usemagpie.ai/>
-   Magpie 英文配置指南：<https://usemagpie.ai/docs/start>
-   Magpie 中文配置指南：<https://usemagpie.ai/docs/zh/start>
-   Herdr TUI 安装：<https://herdr.dev/tui/docs/install/>
-   Herdr TUI Quick Start：<https://herdr.dev/tui/docs/quick-start/>
-   Herdr TUI Integrations：<https://herdr.dev/tui/docs/integrations/>
-   Herdr Windows 支持：<https://herdr.dev/tui/docs/windows-beta/>
-   Codex CLI：<https://github.com/openai/codex>
-   Docker 安装：<https://docs.docker.com/get-started/get-docker/>
-   Docker Engine 安装：<https://docs.docker.com/engine/install/>

**执行原则：先检查，再备份，再安装，再验证。任何安装结果都必须用命令输出或应用界面确认，不得只根据安装命令执行过就宣称成功。**
