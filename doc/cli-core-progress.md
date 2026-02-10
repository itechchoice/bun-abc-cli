# CLI 核心能力进度记录（交互 + 状态管理 + 工作流）

- 记录时间：2026-02-10
- 适用项目：`/Users/hejin/Documents/happy-2026/abc-cli`
- 技术栈基线：`OpenTUI + React + TypeScript + Bun`

## 总览

| 核心能力 | 当前状态 | 结论 |
| --- | --- | --- |
| 交互（Interaction） | 已实现 MVP | 已具备可用 UI Shell 与基础键盘交互 |
| 状态管理（State Management） | 已实现 MVP 封装 | 已完成 `useReducer + Context` 分层与主流程 |
| 工作流（Workflow） | 部分实现 | 已有接口骨架，尚未实现完整任务编排 |

## 1. 交互（Interaction）

### 已实现

- App Shell 结构：`Header / MessagePane / InputPane / StatusBar`
- 输入提交与消息展示闭环（用户消息 + assistant 回复）
- 状态可视化：`idle / thinking / error`
- 快捷键：
  - `Ctrl+C` 退出
  - `Ctrl+R` 重置 session
  - `Esc` 清理错误状态
- 错误提示显示在状态栏

### 仍未实现

- 焦点管理（多面板切换）
- 命令面板、帮助面板、历史检索等高级交互
- 丰富消息渲染（如 markdown/code/diff）

## 2. 状态管理（State Management）

### 已实现

- `state` 层：
  - `AppState/AppAction` 类型定义
  - `appReducer`
  - `AppStateProvider`（Context）
  - selectors
- `hooks` 层：
  - `useAppState/useAppDispatch`
  - `useChatController`
  - `useShortcuts`
- `services` 层（内存实现）：
  - `SessionService`
  - `ConfigService`
- 关键状态流：
  - `draft/set`
  - `chat/submit_start`
  - `chat/submit_success`
  - `chat/submit_error`
  - `chat/clear_error`
  - `session/reset`
- 错误策略：提交失败时保留草稿并显示错误

### 仍未实现

- 会话与配置持久化（当前仅内存）
- 状态历史回放/时间旅行调试
- 更细粒度的 UI 状态域（如面板焦点、选择状态）

## 3. 工作流（Workflow）

### 已实现（基础骨架）

- Provider 抽象接口 + mock 实现：
  - `ProviderClient`
  - `MockProviderClient`
- Tool 抽象接口 + mock 占位：
  - `ToolRegistry`
  - `MockToolRegistry`
- 通过 `useChatController` 串联“提交 -> 调用 provider -> 回写状态”

### 仍未实现（核心能力）

- `plan -> execute -> observe` 多步编排循环
- tool 的真实执行链路与结果注入
- 人工确认节点（高风险操作确认）
- 重试、超时、取消、中断恢复
- 工作流级日志与可观测性

## 结论

- 我们已经完成了三大核心中的前两项 MVP：`交互` 与 `状态管理`。
- `工作流` 当前处于“接口已预埋、编排未落地”阶段。
- 下一阶段应在现有 adapter/service 边界上补齐最小工作流循环，而不是先引入重型外部框架。
