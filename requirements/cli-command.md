# 进入 abc-cli

abc

# 注意

- 以下命令需要像 codex-cli / gemini-cli 那种先进入 abc-cli 这个专用命令壳再输入子命令。
- 快捷命令是先输入斜杠 `/` 然后出现可选命令列表，直接选择即可。

## 登录

- 快捷命令：
  - /login # 交互式登录
  - /whoami
  - /logout

### 登录持久化策略（已定）

- 仅持久化 token，不持久化用户名和密码。
- 本地 token 文件路径：`~/.abc-cli/auth-token.json`
- 启动 `abc` 后，若检测到本地 token：
  - 自动调用 `whoami` 做有效性校验；
  - 校验通过则恢复登录态；
  - 校验失败则清除本地 token，并提示用户重新 `/login`。
- 执行 `/logout` 时必须删除本地 token 文件（或清空 token 内容）。
- 安全要求：
  - 目录权限 `700`
  - token 文件权限 `600`

## 注册 MCP Server + 查询确认

- 快捷命令：
  - /mcp # 列出所有 MCP Server

- 手动命令：
  - mcp add --server-code weather_mcp --url http://127.0.0.1:9001 --version v0
  - mcp get weather_mcp

## 触发 run（意图→选工具→调用）

### 提交

- 手动命令：
  - run submit --objective "查 San Francisco 三日天气"

### 记录 execution_id（手动复制）

- 说明：
  - `run submit ...` 执行后，界面会显示 `execution_id=...`
  - 用户手动复制该 ID，后续命令直接粘贴使用
  - 本轮不做壳内变量（不支持 `$ID` 自动替换）

### 立即查一次状态（证明可查）

- 手动命令：
  - run status <execution_id>

### 跟随事件流（全程可见）

- 手动命令：
  - run events --follow <execution_id>

### 结束后再查状态（证明最终一致）

- 手动命令：
  - run status <execution_id>

### 查最终结果/产物（证明 tool 调用有结果）

- 手动命令：
  - run artifacts <execution_id>
  - run result <execution_id> # 或（可选）
