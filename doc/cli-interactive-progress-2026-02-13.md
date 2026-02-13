# CLI 进度清单（Interactive Shell）

> 更新时间：2026-02-13
> 范围：`OpenTUI + React + TypeScript + Bun` 交互壳模式（不保留一次性命令入口）

## Done

- 已完成交互壳主流程：启动后直接进入壳内交互，不要求 `abc run ...` 外层命令模式。
- 已完成 Slash 命令能力：
  - `/login`
  - `/whoami`
  - `/logout`
  - `/mcp`
  - `/exit`
- 已完成 Slash 候选列表：输入 `/` 可显示可选命令，支持 `Up/Down` 选择、`Enter` 直接执行。
- 已完成 `run` / `mcp` 手动命令解析（壳内输入）：
  - `mcp add/list/get`
  - `run submit/status/events/artifacts/result`
- 已完成本地登录态恢复：启动时自动读取本地 token 并恢复 `whoami` 状态。
- 已完成密码输入安全改造：
  - 密码阶段不明文回显
  - 输入框内显示 `******` 掩码
  - 下方同步显示 `Password: ******`
  - 密码阶段禁用 slash 候选弹层
- 已完成登录流程防误输入守卫：用户名/密码阶段拒绝 `/xxx` 作为输入值。
- 已完成布局重构（当前稳定版）：
  - 底部固定：输入区 + 状态栏
  - 中间主内容区单一滚动（包含 Banner/说明/日志或 execution 视图）
  - 去除 execution 区域内多重嵌套滚动，统一滚动体验
- 已完成 `/exit` 真正退出：
  - slash `/exit` 退出 shell
  - `Ctrl+C` 同路径退出
  - 退出时 `renderer.destroy()` + `process.exit(0)`，避免“黑屏挂住”
- 已完成 parser 测试扩展（包含 `/exit`），当前 `bun test` / `bun run typecheck` 通过。

## TODO（按优先级）

- 对接真实后端 API（替换 mock）：
  - `auth login/whoami`
  - `run submit/status/events/artifacts`
  - `mcp add/list/get`（以你们后端定义为准）
- 统一错误码与错误消息映射：将后端错误转为 CLI 可读文案（鉴权失败、参数错误、资源不存在、服务异常等）。
- 事件流鲁棒性：
  - SSE 断线重连策略（退避、超时、上限）
  - 中断提示与恢复提示的文案规范
- 命令输出规范化：
  - 明确人类可读输出格式
  - 规划后续 `--json` 输出契约（演示后可补）
- 安全与凭证治理：
  - token 存储策略最终确认（权限、过期、清理）
  - 登出后状态彻底清理验证
- 体验细化：
  - 命令帮助页（`/help` 或 `help`）
  - 空态/错误态文案再压缩（演示版）

## 演示可用结论

当前可稳定演示的路径：

1. `/login`
2. `/whoami`
3. `mcp add ...`
4. `mcp list`
5. `run submit --objective "..."`
6. `run status <id>`
7. `run events --follow <id>`
8. `run artifacts <id>`
9. `/exit`

