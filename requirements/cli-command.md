# 进入 abc-cli

abc

# 注意

- 仅支持交互壳模式，不保留一次性外层命令入口。
- 斜杠命令可通过输入 `/` 后选择执行。
- 普通文本不会再作为 intent 自动提交，必须使用明确命令。

## Slash 命令

- `/login`：交互式登录（用户名 + 密码）
- `/mcp`：等价 `mcp list`
- `/logout`：清理本地 token
- `/exit`：退出 abc-cli

## 登录持久化策略

- 仅持久化 `access_token`，不持久化用户名与密码。
- 本地路径：`~/.abc-cli/auth-token.json`
- 启动时自动用受保护接口探活 token：
  - 通过则恢复登录态
  - 失败则清除 token 并提示重新 `/login`
- `/logout` 必须删除本地 token。
- 权限要求：目录 `700`，文件 `600`。

## MCP 命令

- `mcp add --server-code <code> --url <endpoint> --version <v> [--name <name>] [--description <text>] [--auth-type <NONE|API_KEY|BASIC|OAUTH2|JWT|CUSTOM>] [--auth-config-json <json>]`
- `mcp list [--server-code <code>] [--status <active|inactive>]`
- `mcp get <id>`
- `mcp update --id <id> [--name <name>] [--description <text>] [--url <endpoint>] [--auth-type <...>] [--auth-config-json <json>]`
- `mcp delete --id <id>`
- `mcp sync --id <id>`
- `mcp capabilities --id <id>`
- `mcp auth start --id <id> [--connection-name <name>] [--return-url <url>] [--credentials-json <json>]`
- `mcp auth status --id <id>`
- `mcp auth delete --id <id> [--connection-id <id>]`

默认值：
- `name = server_code`
- `auth_type = NONE`
- `auth_config = {}`

## Session 命令

- `session create [--title <text>]`
- `session list [--status <active|archived>] [--page <n>] [--size <n>]`
- `session get <session_id>`

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
- `run status <task_id>`
- `run events --follow <task_id>`
- `run artifacts <task_id>`
- `run cancel <task_id>`

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
