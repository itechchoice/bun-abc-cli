# 进入 abc-cli

abc

# 注意

- 仅支持交互壳模式，不保留一次性外层命令入口。
- 斜杠命令可通过输入 `/` 后选择执行。
- 普通文本不会再作为 intent 自动提交，必须使用明确命令。

## Slash 命令

- `/login`：交互式登录（用户名 + 密码）
- `/mcp`：等价 `mcp list`
- `/sessions`：等价 `session list`
- `/logout`：清理本地 token
- `/exit`：退出 abc-cli

## 登录持久化策略

- 持久化 `access_token` 与 `refresh_token`，不持久化用户名与密码。
- 本地路径：`~/.abc-cli/auth-token.json`
- 启动时仅做本地 token 过期检查（不主动请求后端）：
  - 未过期则恢复登录态
  - 已过期则清除 token 并提示重新 `/login`
- 支持 `auth refresh` 手动刷新 token。
- 任意受保护请求遇到 401 时，CLI 自动尝试 refresh 并重试一次。
- `/logout` 必须删除本地 token。
- 权限要求：目录 `700`，文件 `600`。

## Auth 命令

- `auth refresh`

## MCP 命令

- `mcp add --server-code <code> --url <endpoint> --version <v> [--name <name>] [--description <text>] [--auth-type <NONE|API_KEY|BASIC|OAUTH2|JWT|CUSTOM>] [--auth-config-json <json>]`
- `mcp add --payload-json <json>`
- `mcp add --payload-file <path>`
- `mcp list [--server-code <code>] [--status <active|inactive>]`
- `mcp get <id>`
- `mcp update --id <id> [--name <name>] [--description <text>] [--url <endpoint>] [--auth-type <...>] [--auth-config-json <json>]`
- `mcp delete --id <id>`
- `mcp sync --id <id>`
- `mcp capabilities --id <id>`
- `mcp auth start --id <id> [--connection-name <name>] [--return-url <url>] [--credentials-json <json>]`
- `mcp auth start --id <id> --payload-json <json>`
- `mcp auth start --id <id> --payload-file <path>`
- `mcp auth status --id <id>`
- `mcp auth delete --id <id> [--connection-id <id>]`

自动动作：
- `mcp auth start` 返回 `success=true` 后，CLI 自动执行一次 `mcp sync --id <id>`。

参数规则：
- `mcp add` 中 `--payload-json` 与 `--payload-file` 互斥，且都与 `--server-code/--url/--version/...` 互斥。
- `mcp auth start` 中 `--payload-json` 与 `--payload-file` 互斥，且都与 `--connection-name/--return-url/--credentials-json` 互斥。

默认值：
- `name = serverCode`
- `authType = NONE`
- `authConfig = {}`

## Session 命令

- `session create [--title <text>]`
- `session list [--status <active|archived>] [--page <n>] [--size <n>]`
- `session get <sessionId>`
- `session use <sessionId>`
- `session current`
- `session leave`

## Theme 命令

- `theme list`
- `theme current`
- `theme set <name>`
- `theme set --name <name>`

支持主题：
- `dark`
- `light-hc`

持久化：
- 路径：`~/.abc-cli/theme.json`
- 启动优先级：`ABC_THEME`（环境变量） > 本地 theme 文件 > 默认 `dark`

## Run 命令

- `run submit --objective <text> [--session-id <id>]`
- `run list [--status <status>] [--page <n>] [--size <n>]`
- `run status <task_id>`
- `run events --follow <task_id>`
- `run cancel <task_id>`

会话强约束：
- 执行 `run *` 前必须存在 active session（通过 `session use` 或 `session create` 建立）。
- `run submit` 若显式传 `--session-id`，必须与 active session 一致。
- `run status` / `run events` / `run cancel` 会校验 task 的 `sessionId` 与 active session 一致，不一致时提示先 `session use <id>`。

## 输出规范（强约束）

每次 HTTP 调用都输出：
1. `> METHOD /path`
2. `< STATUS <code>`
3. 返回体 JSON（pretty print）

- 4xx/5xx 同样完整输出 JSON。
- 非 JSON 返回体回退为：`{"raw_text":"...","content_type":"..."}`。
- SSE 逐条输出：`{"event":"...","data":{...}}`。

## SSE 跟随语义

- `run events --follow <task_id>` 建立 SSE。
- 收到 `task.completed`、`task.failed`、`task.cancelled` 立即结束。
- 连接异常触发重连：`1s -> 2s -> 4s -> 8s`（上限 8s）。
- 每次重连前先调用 `GET /tasks/{task_id}` 并输出其 JSON。
- 若任务已终态则停止重连。
