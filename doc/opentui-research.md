# OpenTUI 文档熟悉记录与结论

- 记录时间：2026-02-10
- 记录人：Codex
- 适用项目：`/Users/hejin/Documents/happy-2026/abc-cli`

## 1. 本次阅读范围

1. OpenTUI React bindings 文档：<https://opentui.com/docs/bindings/react>
2. OpenTUI GitHub 仓库：<https://github.com/anomalyco/opentui>

## 2. 我已熟悉的关键点

### 2.1 React bindings（与当前项目最直接相关）

1. 官方推荐起手方式就是 `bun create tui --template react`，与你当前创建方式一致。
2. React 入口范式是：`createCliRenderer()` + `createRoot(renderer).render(<App />)`。
3. TypeScript 关键配置包括：
   - `jsx: "react-jsx"`
   - `jsxImportSource: "@opentui/react"`
4. JSX 组件覆盖了构建 CLI 产品的大多数基础需求：
   - 布局与显示：`<box>`, `<text>`, `<scrollbox>`, `<ascii-font>`
   - 输入交互：`<input>`, `<textarea>`, `<select>`, `<tab-select>`
   - 内容渲染：`<code>`, `<line-number>`, `<diff>`, `<markdown>`
5. 常用 Hooks 包括：
   - `useRenderer()`：访问 renderer（含 console 等能力）
   - `useKeyboard()`：处理快捷键、按键事件（支持 release 事件）
   - `useOnResize()` 与 `useTerminalDimensions()`：终端尺寸响应
   - `useTimeline()`：动画时间线
6. 支持组件扩展（`extend` + TS 声明合并），适合做公司内统一 TUI 组件库。
7. 支持 React DevTools（需要 dev 依赖与 `DEV=true` 运行）。

### 2.2 OpenTUI GitHub（项目成熟度与工程信息）

1. 仓库定位：OpenTUI 是用于构建 TUI 的 TypeScript 库。
2. 仓库 README 明确说明项目仍在 development 阶段，暂不建议按“稳定生产框架”心态直接假设所有 API 长期不变。
3. monorepo 关键包：
   - `@opentui/core`
   - `@opentui/react`
   - `@opentui/solid`
4. README 给出了 docs、development guide、examples 等入口，适合遇到问题时按官方路径排查。
5. GitHub 页面显示（截至 2026-02-10）最新 release 为 `v0.1.77`（页面标注日期为 2026-02-02）。

## 3. 对当前项目的明确结论

1. 技术路线应保持为 `OpenTUI + React`，这是与你技能结构最匹配的路线。
2. 当前项目继续使用 React 组件化思维开发终端界面是正确方向，不应改成纯命令式 Node CLI。
3. 开发时优先查官方文档和仓库信息，再做实现；Context7 可作为检索入口。
4. 工程策略应采用“渐进增强”：先做可用 UI 骨架，再迭代工具调用、会话、状态管理和可视化反馈。

## 4. 后续实现建议（按优先级）

1. 先搭 App Shell：`Header + MainPane + InputPane + StatusBar`。
2. 把输入与消息流封装为 React state/reducer，保持可维护性。
3. 将键盘行为统一收敛到 `useKeyboard()`，避免散落在组件里。
4. 先封装公司级基础组件（如 `MessageList`, `PromptInput`, `ShortcutHint`），再扩功能。
5. 每新增一个交互能力都写到文档与快捷键帮助区，降低团队接入成本。

## 5. 参考链接

- React bindings：<https://opentui.com/docs/bindings/react>
- GitHub 仓库：<https://github.com/anomalyco/opentui>
- OpenTUI docs 入口：<https://opentui.com/docs/getting-started>
