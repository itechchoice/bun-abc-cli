# CLI 进度清单（Interactive Shell）

> 更新时间：2026-02-14
> 范围：`OpenTUI + React + TypeScript + Bun` 交互壳模式（仅 PLATFORM_API）

## Done

- 已删除昨日不适配能力：
  - 删除 `/whoami`
  - 删除 `run result`
  - 删除旧 `Business Contract` / `Provider mock` / intent-flow 状态链路
- 已切换为 PLATFORM_API 直连：
  - `POST /auth/login`
  - `mcp` 全量接口（add/list/get/update/delete/sync/capabilities/auth）
  - `session`（create/list/get）
  - `run`（submit/status/events/artifacts/cancel）
- 已完成交互壳命令面重构：
  - Slash：`/login` `/mcp` `/logout` `/exit`
  - 手动命令：`theme/mcp/session/run` 全量子命令
- 已完成双主题与可读性改造：
  - 支持 `dark` 与 `light-hc` 两套主题
  - 支持 `theme list/current/set` 运行时切换
  - 主题选择持久化到 `~/.abc-cli/theme.json`
  - 状态栏显示当前主题 `theme:<name>`
- 已完成统一输出契约：
  - 每次 HTTP 请求打印 method/path/status
  - 成功与失败都打印返回体 JSON
  - 非 JSON 回退 `raw_text/content_type`
- 已完成 SSE 直连与重连：
  - `run events --follow <task_id>` 实时流式输出
  - 终态事件自动结束
  - 断线按 `1s/2s/4s/8s` 退避重连
  - 重连前先 `GET /tasks/{task_id}` 并输出 JSON
- 已保留并验证登录安全能力：
  - 密码输入掩码
  - 启动自动恢复本地 token
  - token 失效自动清理并提示重登
- 已完成测试：
  - parser
  - auth-token-store（含 700/600 权限）
  - platform api client
  - sse parser
- 当前 `bun test` / `bun run typecheck` 已通过。

## TODO（当前剩余）

- 对接真实环境联调验证：
  - 校验真实后端在所有命令上的字段兼容性
  - 验证 OAuth2 auth start/status/delete 的真实返回行为
- 增加命令帮助页（可选）：
  - `help` 或 `/help`
- 可选增强：
  - token 刷新（refresh_token）
  - 命令输出 `--json` 开关（当前默认已是 JSON-first）

## 演示建议路径

1. `/login`
2. `mcp add ...`
3. `/mcp`
4. `mcp get <id>`
5. `run submit --objective "..."`
6. `run status <task_id>`
7. `run events --follow <task_id>`
8. `run artifacts <task_id>`
9. `/exit`
