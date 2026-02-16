# abc-cli

`abc-cli` 是一个基于 `OpenTUI + React + TypeScript + Bun` 的交互壳 CLI，当前按 `requirements/PLATFORM_API_v2.md` 直连后端接口。

## Requirements

- Bun

## Local Development

```bash
bun install
bun run dev
```

类型检查：

```bash
bun run typecheck
```

测试：

```bash
bun test
```

## Run

```bash
bun run start
# or
bun run src/index.tsx
```

## Interactive Shell

启动：

```bash
abc
```

Slash 命令：

- `/login`
- `/mcp`
- `/sessions`
- `/logout`
- `/exit`

手动命令（核心）：

- `auth refresh`
- `theme list`
- `theme current`
- `theme set light-hc`
- `mcp add --server-code weather_mcp --url http://127.0.0.1:9001 --version v0`
- `mcp add --payload-json '{"serverCode":"weather_mcp","version":"v0","name":"Weather","endpoint":"http://127.0.0.1:9001","authType":"NONE","authConfig":{}}'`
- `mcp list`
- `mcp get <id>`
- `session create --title "天气会话"`
- `session use <sessionId>`
- `session current`
- `session leave`
- `run list --status RUNNING --page 1 --size 20`
- `run submit --objective "查 San Francisco 三日天气" --session-id <sessionId>`
- `run status <task_id>`
- `run events --follow <task_id>`
- `run cancel <task_id>`

完整命令契约见：`requirements/cli-command.md`。

## Theme Support

- 支持两套主题：`dark`、`light-hc`
- 运行时切换：
  - `theme list`
  - `theme current`
  - `theme set <name>`
- 主题持久化路径：`~/.abc-cli/theme.json`
- 启动优先级：`ABC_THEME` > 本地 theme 文件 > 默认 `dark`

## Output Contract

所有后端调用（成功或失败）都会输出：

1. `> METHOD /path`
2. `< STATUS <code>`
3. 返回体 JSON（pretty print）

SSE 事件流逐条输出：

```json
{"event":"task.created","data":{"taskId":20001,"status":"CREATED"}}
```

## Spinner

- 已使用 `opentui-spinner` 替换自研 loading 组件
- 接口调用进行中会在输入框左侧显示 spinner：`loading(n)`
- `n` 为全局并发请求计数（前台命令 + 后台 SSE follow 请求）

## Token Persistence

- 持久化 `access_token` 与 `refresh_token`
- 路径：`~/.abc-cli/auth-token.json`
- 目录权限：`700`
- 文件权限：`600`
- 启动时只做本地过期检查（不请求后端）；若 token 过期会自动清理并提示重新 `/login`
- 支持手动刷新：`auth refresh`
- 遇到 401 时会自动尝试刷新并重试一次请求

## Global Install From GitHub

```bash
bun add -g github:<owner>/<repo>
```

安装后：

```bash
which abc
abc
```
