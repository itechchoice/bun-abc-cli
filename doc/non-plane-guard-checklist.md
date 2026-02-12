# 非权力机制层合宪守卫清单（CLI）

- 适用范围：`Interaction Surface + Observation/Query`
- 项目：`/Users/hejin/Documents/happy-2026/abc-cli`

## 守卫目标

1. CLI 只接收/规范化/提交意图（Business Contract）。
2. CLI 只读展示执行视图（ExecutionState / DAG / Artifacts）。
3. CLI 不承担 Scheduler、Decision、Reconcile、Execution 权力。

## 代码守卫（已落地）

1. Surface 生命周期守卫  
   `submitted/observing` 阶段禁止继续接收同一意图输入。  
   实现：`/Users/hejin/Documents/happy-2026/abc-cli/src/guards/non-plane-guards.ts`

2. Trigger 来源守卫  
   CLI 提交只能使用 `interaction_surface` 触发，禁止伪装 `outer_scheduler`。  
   实现：`/Users/hejin/Documents/happy-2026/abc-cli/src/guards/non-plane-guards.ts`

3. Business Contract 显式建模与校验  
   输入被解析为 `objective/context_refs/constraints/execution_strategy`，不从历史消息推断。  
   实现：`/Users/hejin/Documents/happy-2026/abc-cli/src/domain/business-contract.ts`

4. 只读观察守卫  
   观察期只做 `getExecutionView + subscribeExecutionView`，无执行控制入口。  
   实现：`/Users/hejin/Documents/happy-2026/abc-cli/src/hooks/use-intent-controller.ts`

5. 断流重连守卫  
   SSE/流断开仅重连查询，不触发新 Run Request。  
   实现：`/Users/hejin/Documents/happy-2026/abc-cli/src/hooks/use-intent-controller.ts`

6. 终态后新意图守卫  
   终态（`COMPLETED/FAILED/CANCELLED`）后，输入会进入新 intent 生命周期，不续命旧 execution。  
   实现：`/Users/hejin/Documents/happy-2026/abc-cli/src/hooks/use-intent-controller.ts`

## Review Checklist（评审时逐条打勾）

1. 是否出现 `outer_scheduler` 触发路径被 CLI 主动调用。
2. 是否出现观察期对执行路径/策略的修改能力。
3. 是否出现 CLI 基于执行结果做 retry/replan/fallback 决策。
4. 是否出现在同一 execution 生命周期内“重启/续命”语义。
5. 是否出现从对话历史推断结构或隐藏字段补全。
