# PLATFORM_API 联调清单（Interactive Shell / 当前实现对齐）

> 适用项目：`abc-cli`
> 适用接口契约：`requirements/PLATFORM_API_v2.md`
> 运行模式：交互壳（不支持一次性外层命令模式）

---

## 1. 文档定位与前提

这份清单用于前后端联调与演示，目标是让你按固定顺序走完：

1. 登录
2. MCP 管理
3. 会话管理
4. 会话内任务管理
5. 退出与清理

全程遵循当前 CLI 行为：

- 启动时不主动请求后端，只做本地 token 过期检查。
- 所有 HTTP 调用都打印：`> METHOD /path`、`< STATUS code`、JSON 返回体。
- `run events --follow` 为前台观察者模式：观察期间不接收其他命令，`Ctrl+C` 停止观察。

### 输出契约（适用于全文）

1. 每次 HTTP 调用固定输出三段：

- `> METHOD /path`
- `< STATUS <code>`
- JSON 返回体（成功/失败都打印）

2. 若返回体非 JSON，会打印为：

- `{\"raw_text\":\"...\",\"content_type\":\"...\"}`

3. SSE 逐条输出：

- `{\"event\":\"...\",\"data\":{...}}`

启动示例：

```bash
cd /Users/hejin/Documents/happy-2026/abc-cli
bun run dev
```

可选：指定 API 前缀

```bash
ABC_API_BASE_URL="https://arch.stg.alphabitcore.io/api/v1" bun run dev
```

---

## 2. 启动与登录（Auth）

### 2.1 交互登录（slash）

- 命令：`/login`
- 接口映射：`POST /auth/login`
- 接口用途：校验账号密码并签发 `access_token/refresh_token`。
- 关键入参：`username`、`password`（在 CLI 中交互输入）。
- 关注返回字段：`access_token`、`refresh_token`、`token_type`、`expires_in`。

> 说明：密码输入为掩码显示。

### 2.2 手动刷新令牌

- 命令：`auth refresh`
- 接口映射：`POST /auth/refresh`
- 接口用途：用 `refresh_token` 换新 `access_token`。
- 关键入参：`refresh_token`（CLI 从本地存储读取）。
- 关注返回字段：`access_token`、`refresh_token`、`expires_in`。

### 2.3 登出

- 命令：`/logout`
- 接口映射：无后端调用。
- 接口用途：无；仅清理本地 token 存储。
- 关键入参：无。
- 关注返回字段：无。

---

## 3. MCP 管理

### 3.1 查询 MCP 列表（slash / 手动）

- 命令：`/mcp`（等价 `mcp list`）
- 接口映射：`GET /mcp/servers`
- 接口用途：获取当前租户下 MCP Server 列表，用于确认已注册服务。
- 关键入参：可选 `serverCode`、`status`。
- 关注返回字段：`id`、`serverCode`、`status`、`connectionStatus`、`cacheVersion`。

### 3.2 注册 MCP（参数模式）

- 命令：`mcp add --server-code weather_mcp --url http://127.0.0.1:9001 --version v0`
- 接口映射：`POST /mcp/servers`
- 接口用途：注册一个新的 MCP Server。
- 关键入参：`serverCode`、`version`、`name`、`endpoint`、`authType`、`authConfig`。
- 关注返回字段：`id`、`status`、`cacheVersion`。

### 3.3 注册 MCP（整包 JSON 模式）

- 命令：

```text
mcp add --payload-json '{"serverCode":"weather_mcp","version":"v0","name":"Weather","endpoint":"http://127.0.0.1:9001","authType":"NONE","authConfig":{}}'
```

- 接口映射：`POST /mcp/servers`
- 接口用途：一次性提交完整 MCP 注册对象。
- 关键入参：`--payload-json`（JSON 对象，且与拆分参数互斥）。
- 关注返回字段：`id`、`status`、`cacheVersion`。

### 3.4 MCP 认证

#### 查询认证状态

- 命令：`mcp auth status --id <id>`
- 接口映射：`GET /mcp/servers/{id}/auth`
- 接口用途：查询该 MCP 的连接/认证状态。
- 关键入参：`id`。
- 关注返回字段：`authenticated`、`connectionId`、`authType`。

#### 发起认证（参数模式）

- 命令：`mcp auth start --id <id> [--connection-name <name>] [--return-url <url>] [--credentials-json <json>]`
- 接口映射：`POST /mcp/servers/{id}/auth`
- 接口用途：为 MCP 建立可用认证连接。
- 关键入参：`id` + 可选认证参数。
- 关注返回字段：`success`、`connectionId`。

#### 发起认证（整包 JSON 模式）

- 命令：`mcp auth start --id <id> --payload-json <json>`
- 接口映射：`POST /mcp/servers/{id}/auth`
- 接口用途：一次性提交认证请求对象。
- 关键入参：`--payload-json`（与拆分参数互斥）。
- 关注返回字段：`success`、`connectionId`。

> 当前 CLI 自动动作：当 `mcp auth start` 返回 `success=true` 时，会自动追加一次 `POST /mcp/servers/{id}/sync`。

#### 删除认证连接

- 命令：`mcp auth delete --id <id> [--connection-id <id>]`
- 接口映射：`DELETE /mcp/servers/{id}/auth`
- 接口用途：删除 MCP 已建立的认证连接。
- 关键入参：`id`，可选 `connectionId`。
- 关注返回字段：删除确认信息（以后端返回为准）。

### 3.5 MCP 详情、更新、删除

#### 详情

- 命令：`mcp get <id>`
- 接口映射：`GET /mcp/servers/{id}`
- 接口用途：查看单个 MCP Server 的完整配置与状态。
- 关键入参：`id`。
- 关注返回字段：`id`、`endpoint`、`authType`、`status`、`cacheVersion`。

#### 更新

- 命令：`mcp update --id <id> [--name ...] [--description ...] [--url ...] [--auth-type ...] [--auth-config-json ...]`
- 接口映射：`PUT /mcp/servers/{id}`
- 接口用途：修改 MCP Server 配置。
- 关键入参：`id` + 至少一个更新字段。
- 关注返回字段：更新后的 MCP 对象字段。

#### 删除

- 命令：`mcp delete --id <id>`
- 接口映射：`DELETE /mcp/servers/{id}`
- 接口用途：删除 MCP Server。
- 关键入参：`id`。
- 关注返回字段：删除确认信息（以后端返回为准）。

### 3.6 MCP 同步与能力查询

#### 手动同步

- 命令：`mcp sync --id <id>`
- 接口映射：`POST /mcp/servers/{id}/sync`
- 接口用途：主动触发能力同步，更新能力缓存版本。
- 关键入参：`id`。
- 关注返回字段：`cacheVersion`、`capabilitiesCount`、`diff`。

#### 能力列表

- 命令：`mcp capabilities --id <id>`
- 接口映射：`GET /mcp/servers/{id}/capabilities`
- 接口用途：查看该 MCP 当前可用能力清单。
- 关键入参：`id`。
- 关注返回字段：能力数组（`name`、`description`、`status` 等）。

---

## 4. 会话管理（查看 / 进入 / 离开）

### 4.1 查看会话列表（slash / 手动）

- 命令：`/sessions`（等价 `session list`）
- 接口映射：`GET /sessions`
- 接口用途：分页查询会话，便于选择要进入的会话。
- 关键入参：可选 `status`、`page`、`size`。
- 关注返回字段：`items[].sessionId`、`items[].status`、`total`、`page`、`size`。

### 4.2 创建会话

- 命令：`session create [--title "天气联调"]`
- 接口映射：`POST /sessions`
- 接口用途：创建会话容器，用于归档同一轮任务与消息。
- 关键入参：可选 `title`。
- 关注返回字段：`sessionId`、`status`、`createdAt`。

> 当前 CLI 行为：创建成功后会自动将该会话设置为 active session。

### 4.3 查看会话详情

- 命令：`session get <sessionId>`
- 接口映射：`GET /sessions/{session_id}`
- 接口用途：查看该会话详情与关联消息/任务信息。
- 关键入参：`sessionId`。
- 关注返回字段：`sessionId`、`messages`、`status`。

### 4.4 进入会话

- 命令：`session use <sessionId>`
- 接口映射：`GET /sessions/{session_id}`
- 接口用途：先验证会话存在，再把它设为 CLI 当前 active session。
- 关键入参：`sessionId`。
- 关注返回字段：`sessionId`（CLI 侧会把它写入当前上下文）。

### 4.5 查看当前会话

- 命令：`session current`
- 接口映射：`GET /sessions/{session_id}`（其中 `session_id` 为 active session）
- 接口用途：确认“我当前在哪个会话里”。
- 关键入参：无（内部使用 active session）。
- 关注返回字段：`sessionId`、`status`。

### 4.6 离开会话

- 命令：`session leave`
- 接口映射：无后端调用。
- 接口用途：仅清空本地 active session。
- 关键入参：无。
- 关注返回字段：无。

---

## 5. 任务管理（会话内）

> 强约束：执行任何 `run *` 之前，必须已有 active session（`session create` 或 `session use`）。

### 5.1 创建任务

- 命令：`run submit --objective "查询 San Francisco 三日天气" [--session-id <id>]`
- 接口映射：`POST /tasks`
- 接口用途：提交任务，进入后端执行管线。
- 关键入参：`message`（由 `--objective` 映射），`sessionId`。
- 关注返回字段：`taskId`、`sessionId`、`status`。

当前 CLI 行为：

- 未传 `--session-id` 时，默认使用 active session。
- 传了 `--session-id` 时，必须与 active session 一致，否则报错。

### 5.2 任务列表

- 命令：`run list [--status RUNNING] [--page 1] [--size 20]`
- 接口映射：`GET /tasks`
- 接口用途：分页查询当前用户任务列表，可按状态过滤。
- 关键入参：可选 `status`、`page`、`size`。
- 关注返回字段：`items[].taskId`、`items[].sessionId`、`items[].status`、`total`。

### 5.3 任务状态/详情

- 命令：`run status <taskId>`
- 接口映射：`GET /tasks/{task_id}`
- 接口用途：查询单个任务当前状态、步骤、结果/错误。
- 关键入参：`taskId`。
- 关注返回字段：`taskId`、`sessionId`、`status`、`steps`、`result`、`error`。

### 5.4 任务事件流（SSE）

- 命令：`run events --follow <taskId>`
- 接口映射：`GET /tasks/{task_id}/events`（SSE）
- 接口用途：实时观察任务事件推进。
- 关键入参：`taskId`（必须属于当前 active session）。
- 关注返回字段：SSE 事件 `event`、`data`。

当前 CLI 行为：

- 前台观察者模式：观察期间不接受其他命令。
- 收到终态事件（`task.completed/task.failed/task.cancelled`）自动结束。
- 可用 `Ctrl+C` 手动停止观察模式（不退出 CLI）。

### 5.5 取消任务

- 命令：`run cancel <taskId>`
- 接口映射：`POST /tasks/{task_id}/cancel`
- 接口用途：取消未完成任务。
- 关键入参：`taskId`。
- 关注返回字段：`taskId`、`status`（期望 `CANCELLED`）。

---

## 6. 退出与清理

### 6.1 清理登录态

- 命令：`/logout`
- 接口映射：无后端调用。
- 接口用途：清理本地 token，强制回到未登录状态。
- 关键入参：无。
- 关注返回字段：无。

### 6.2 退出壳

- 命令：`/exit`
- 接口映射：无后端调用。
- 接口用途：退出 CLI 命令壳。
- 关键入参：无。
- 关注返回字段：无。

---

## 7. 常见误区与错误排查

1. **启动后为什么没有自动请求后端？**

- 这是当前设计：启动只做本地 token 过期判断，不做后端探活。

2. **为什么 `run *` 报“需要 active session”？**

- 先执行 `session create` 或 `session use <id>`。

3. **为什么 `run status/cancel/events` 报会话不一致？**

- 该 task 不属于当前会话，按提示执行 `session use <task.sessionId>`。

4. **为什么 follow 时不能执行其他命令？**

- 当前是前台观察者模式，目的是避免日志歧义；先等终态或按 `Ctrl+C` 停止观察。

5. **`mcp add --payload-json` 报互斥错误？**

- `--payload-json` 不能与 `--server-code/--url/--version/...` 同时使用。

---

## 8. 附录 A：命令 → 接口 → 接口用途 总表

| 命令                             | 接口                                 | 接口用途                |
| -------------------------------- | ------------------------------------ | ----------------------- |
| `/login`                         | `POST /auth/login`                   | 登录换取 token          |
| `auth refresh`                   | `POST /auth/refresh`                 | 刷新 access token       |
| `/logout`                        | 无                                   | 清本地 token            |
| `/mcp` / `mcp list`              | `GET /mcp/servers`                   | 查询 MCP 列表           |
| `mcp add ...`                    | `POST /mcp/servers`                  | 注册 MCP Server         |
| `mcp get <id>`                   | `GET /mcp/servers/{id}`              | 查询 MCP 详情           |
| `mcp update --id <id> ...`       | `PUT /mcp/servers/{id}`              | 更新 MCP 配置           |
| `mcp delete --id <id>`           | `DELETE /mcp/servers/{id}`           | 删除 MCP                |
| `mcp sync --id <id>`             | `POST /mcp/servers/{id}/sync`        | 同步能力缓存            |
| `mcp capabilities --id <id>`     | `GET /mcp/servers/{id}/capabilities` | 查询能力列表            |
| `mcp auth start --id <id> ...`   | `POST /mcp/servers/{id}/auth`        | 发起 MCP 认证           |
| `mcp auth status --id <id>`      | `GET /mcp/servers/{id}/auth`         | 查询 MCP 认证状态       |
| `mcp auth delete --id <id> ...`  | `DELETE /mcp/servers/{id}/auth`      | 删除 MCP 认证连接       |
| `session create [--title ...]`   | `POST /sessions`                     | 创建会话                |
| `/sessions` / `session list ...` | `GET /sessions`                      | 查询会话列表            |
| `session get <id>`               | `GET /sessions/{session_id}`         | 查询会话详情            |
| `session use <id>`               | `GET /sessions/{session_id}`         | 验证并进入会话          |
| `session current`                | `GET /sessions/{session_id}`         | 查询当前 active session |
| `session leave`                  | 无                                   | 清本地 active session   |
| `run submit --objective ...`     | `POST /tasks`                        | 创建任务                |
| `run list ...`                   | `GET /tasks`                         | 查询任务列表            |
| `run status <taskId>`            | `GET /tasks/{task_id}`               | 查询任务状态/详情       |
| `run events --follow <taskId>`   | `GET /tasks/{task_id}/events`        | SSE 实时观察任务事件    |
| `run cancel <taskId>`            | `POST /tasks/{task_id}/cancel`       | 取消任务                |
| `/exit`                          | 无                                   | 退出 CLI                |

---

## 9. 附录 B：观察者模式（run events --follow）说明

1. `run events --follow <taskId>` 进入前台观察模式。
2. 观察期间不接收其他命令输入。
3. 收到终态事件自动结束。
4. 手动退出方式：`Ctrl+C`（仅停止观察，不退出 CLI）。
5. 断线会按退避重连：`1s -> 2s -> 4s -> 8s`（上限 8s）。

---

## 10. 附录 C：关键返回字段速查

### 10.1 MCP 相关

- `id`：MCP Server 主键。
- `status`：服务状态（如 `ACTIVE` / `INACTIVE`）。
- `cacheVersion`：能力缓存版本号。
- `connectionStatus`：认证连接状态。

### 10.2 会话相关

- `sessionId`：会话主键。
- `status`：会话状态（如 `active` / `archived`）。
- `createdAt`：创建时间。

### 10.3 任务相关

- `taskId`：任务主键。
- `sessionId`：任务归属会话。
- `status`：任务状态（`CREATED`/`RUNNING`/`COMPLETED`/`FAILED`/`CANCELLED` 等）。
- `steps`：执行步骤详情。
- `result` / `error`：终态结果或错误信息。
