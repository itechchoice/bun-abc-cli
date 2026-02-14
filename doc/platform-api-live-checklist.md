# PLATFORM_API 联调清单（Interactive Shell）

> 适用项目：`abc-cli`
> 运行模式：交互壳（非一次性命令模式）

## 0. 启动

```bash
cd /Users/hejin/Documents/happy-2026/abc-cli
bun run dev
```

可选：指定 API 地址

```bash
ABC_API_BASE_URL="https://dychoice.stg.alphabitcore.io/api/v1" bun run dev
```

---

## 1. 登录

在壳内执行：

```text
/login
```

然后按提示输入：
- 用户名（回车）
- 密码（回车，输入框掩码显示）

---

## 2. MCP 注册与查询

```text
mcp add --server-code weather_mcp --url http://127.0.0.1:9001 --version v0
```

从返回 JSON 记录 `id`（示例：`id=1`）。

```text
/mcp
mcp get 1
mcp sync --id 1
mcp capabilities --id 1
```

---

## 3. MCP Auth（可选联调）

```text
mcp auth status --id 1
mcp auth start --id 1 --connection-name demo --credentials-json '{"headers":{"X-API-Key":"demo-key"}}'
mcp auth status --id 1
```

---

## 4. Session

```text
session create --title "天气联调"
session list --page 1 --size 20
session get 10001
```

从返回 JSON 记录 `session_id`（示例：`10001`）。

---

## 5. Run 全流程

```text
run submit --objective "查询 San Francisco 三日天气" --session-id 10001
```

从返回 JSON 记录 `task_id`（示例：`20001`）。

```text
run status 20001
run events --follow 20001
run artifacts 20001
```

取消任务联调（可选）：

```text
run cancel 20001
run status 20001
```

---

## 6. 登出与退出

```text
/logout
/exit
```

---

## 验收检查点（必须满足）

1. 每次 HTTP 请求都输出三段：
- `> METHOD /path`
- `< STATUS <code>`
- 返回体 JSON（成功/失败都输出）

2. `run events --follow <task_id>` 能持续输出 SSE 事件：
- 每条格式：`{"event":"...","data":{...}}`
- 终态事件后自动结束

3. 登录态行为正确：
- `/logout` 后受保护命令应返回未授权（并提示重新 `/login`）

4. MCP 注册返回体包含关键信息：
- `id`
- `status`
- `cache_version`
