# CLI 命令体系规范 v0（会后草案）

- 记录时间：2026-02-13
- 适用项目：`/Users/hejin/Documents/happy-2026/abc-cli`
- 技术栈基线：`OpenTUI + React + TypeScript + Bun`
- 架构范围：`Interaction Surface + Read-only Query + Scheduler API Ingress`

## 1. 命令目标

1. 定义清晰的命令树（主命令/子命令/参数）。
2. 明确 CLI 与后端的职责边界。
3. 为后续正式接口接入提供稳定外壳。

## 2. 关键边界（冻结）

1. `run`：只做提交与只读观察。
2. `schedule`：只调用后端调度接口，CLI 不实现本地 timer/cron。
3. CLI 不提供 `retry/replan/next_step` 执行控制。
4. `auth login` 仅交互式输入账号和密码，不支持命令行传入凭证。

## 3. 命令树（v0）

```bash
abc                             # 启动 OpenTUI UI
abc help
abc version

abc auth login [--endpoint <url>]
abc auth logout
abc auth whoami

abc run submit --objective <text> [--context-ref <ref> ...] [--constraint <c> ...] [--strategy <strategy>]
abc run status --execution-id <id> [--watch]
abc run events --execution-id <id> [--follow]
abc run artifacts --execution-id <id>

abc schedule create --contract-ref <ref> --strategy <strategy> [--name <label>]
abc schedule list [--status active|paused] [--limit <n>]
abc schedule get --id <schedule-id>
abc schedule run-now --id <schedule-id>
abc schedule pause --id <schedule-id>
abc schedule resume --id <schedule-id>
abc schedule delete --id <schedule-id> [--yes]

abc config set endpoint <url>
abc config get endpoint
abc config list
```

## 4. 关键参数规范

### 4.1 `--strategy`

允许值（v0）：

- `once`
- `max_runs:<n>`
- `cron:<expr>`
- `until_condition:<expr>`

### 4.2 `run submit` 入参映射到 Business Contract

- `--objective` -> `objective`
- `--context-ref`（可重复）-> `context_refs[]`
- `--constraint`（可重复）-> `constraints[]`
- `--strategy` -> `execution_strategy`

## 5. 输出与可脚本化

建议每个子命令支持：

- 默认人类可读输出
- `--json` 机器可读输出（后续加）

## 6. 与后端接口映射（v0）

| CLI 命令 | 方法 | 路径（占位） | 说明 |
| --- | --- | --- | --- |
| `auth login` | `POST` | `/v1/auth/login` | 获取 token |
| `auth whoami` | `GET` | `/v1/auth/whoami` | 获取当前身份 |
| `auth logout` | `POST` | `/v1/auth/logout` | 失效会话（可选） |
| `run submit` | `POST` | `/v1/runs` | 提交 Business Contract |
| `run status` | `GET` | `/v1/runs/{execution_id}` | 获取 snapshot |
| `run events --follow` | `GET (SSE)` | `/v1/runs/{execution_id}/events/stream` | 事件流观察 |
| `run artifacts` | `GET` | `/v1/runs/{execution_id}/artifacts` | 只读产物列表 |
| `schedule create` | `POST` | `/v1/schedules` | 创建调度策略 |
| `schedule list` | `GET` | `/v1/schedules` | 查询调度列表 |
| `schedule get` | `GET` | `/v1/schedules/{id}` | 查询调度详情 |
| `schedule run-now` | `POST` | `/v1/schedules/{id}/run-now` | 触发新实例 |
| `schedule pause` | `POST` | `/v1/schedules/{id}/pause` | 暂停调度 |
| `schedule resume` | `POST` | `/v1/schedules/{id}/resume` | 恢复调度 |
| `schedule delete` | `DELETE` | `/v1/schedules/{id}` | 删除调度 |

## 7. 错误码约束（建议）

所有命令错误统一输出：

- `code`: 稳定错误码
- `message`: 可读信息
- `request_id`: 后端排障 ID

## 8. 里程碑建议

1. 先实现命令骨架（本地 mock）。
2. 接入 `auth` 和 `run` 正式接口。
3. 接入 `schedule` 系列接口（仅 API 调用，不本地调度）。
4. 最后补 `--json` 与帮助文档细化。
