# abc-cli

基于 **OpenTUI + React + TypeScript + Bun** 的交互式命令壳，用于管理 MCP Server、会话与 AI 任务。通过 Slash 命令和结构化子命令直连后端 Platform API。

## Quick Start

```bash
bun install
bun run dev          # 开发模式（watch）
```

可选：指定后端地址

```bash
ABC_API_BASE_URL="https://arch.stg.alphabitcore.io/api/v1" bun run dev
```

## 核心功能

### 🔐 Auth — 登录与令牌管理

| 命令           | 说明                   |
| -------------- | ---------------------- |
| `/login`       | 交互式登录（密码掩码） |
| `auth refresh` | 手动刷新 access token  |
| `/logout`      | 清除本地 token         |

- Token 持久化于 `~/.abc-cli/auth-token.json`（权限 600）
- 遇到 401 时自动尝试刷新并重试

### 🔌 MCP — 服务注册与认证

| 命令                           | 说明                                                   |
| ------------------------------ | ------------------------------------------------------ |
| `/mcp`                         | 查看 MCP Server 列表                                   |
| `mcp add ...`                  | 注册新 MCP（支持参数模式 / `--payload-json` / `--payload-file`） |
| `mcp get <id>`                 | 查看详情                                               |
| `mcp update --id <id> ...`     | 更新配置                                               |
| `mcp delete --id <id>`         | 删除                                                   |
| `mcp sync --id <id>`           | 同步能力缓存                                           |
| `mcp capabilities --id <id>`   | 查看能力列表                                           |
| `mcp auth start/status/delete` | 认证管理                                               |

### 💬 Session — 会话管理

| 命令                           | 说明                         |
| ------------------------------ | ---------------------------- |
| `/sessions`                    | 查看会话列表                 |
| `session create [--title ...]` | 创建会话（自动设为当前会话） |
| `session use <id>`             | 切换到指定会话               |
| `session current`              | 查看当前会话                 |
| `session leave`                | 离开当前会话                 |

### 🚀 Task — 任务执行与观察

> 前置条件：必须先有 active session。

| 命令                            | 说明                          |
| ------------------------------- | ----------------------------- |
| `run submit --objective "..." ` | 提交任务                      |
| `run list [--status ...]`       | 查看任务列表                  |
| `run status <taskId>`           | 查看任务状态                  |
| `run events --follow <taskId>`  | SSE 实时观察（`Ctrl+C` 停止） |
| `run cancel <taskId>`           | 取消任务                      |

### 🎨 Theme — 主题切换

支持 `dark` / `light-hc` 两套主题，运行时通过 `theme set <name>` 切换。

优先级：`ABC_THEME` 环境变量 > `~/.abc-cli/theme.json` > 默认 `dark`

## 完整参考

- 命令契约：[`requirements/cli-command.md`](requirements/cli-command.md)
- API 契约：[`requirements/PLATFORM_API_v2.md`](requirements/PLATFORM_API_v2.md)
- 联调清单：[`doc/platform-api-live-checklist.md`](doc/platform-api-live-checklist.md)

## 开发

```bash
bun run typecheck    # 类型检查
bun test             # 运行测试
```

## 全局安装

```bash
bun add -g github:<owner>/<repo>
abc                  # 启动
```
