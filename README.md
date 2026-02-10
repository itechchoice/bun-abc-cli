# abc-cli

`abc-cli` 是一个基于 `OpenTUI + React + TypeScript + Bun` 的终端产品原型。

## Requirements

- Bun
- zsh（Ghostty 默认）

## Local Development

```bash
bun install
bun run dev
```

类型检查：

```bash
bun run typecheck
```

## Run in Repo

```bash
bun run start
# or
bun run src/index.tsx
```

## Global Install From GitHub

将 `<owner>/<repo>` 替换为你的实际仓库：

```bash
bun add -g github:<owner>/<repo>
```

安装后检查：

```bash
which abc
abc
```

## Ghostty / zsh PATH

如果 `which abc` 找不到命令，把 Bun 全局 bin 加入 PATH：

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

持久化到 `~/.zshrc`：

```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Upgrade

重复安装命令即可覆盖升级：

```bash
bun add -g github:<owner>/<repo>
```

## Uninstall

```bash
bun remove -g abc-cli
```

## UX Notes

- 启动时固定显示 Greeting Banner（非阻塞）。
- 默认命令名为 `abc`。
