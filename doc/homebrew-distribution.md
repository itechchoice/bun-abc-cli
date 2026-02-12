# Homebrew 分发方案（Bun 编译 + Tap 发布）

- 适用项目：`/Users/hejin/Documents/happy-2026/abc-cli`
- 技术栈保持：`OpenTUI + React + TypeScript + Bun`

## 已落地能力

1. 二进制构建脚本：`scripts/release/build-archive.sh`
2. Formula 生成脚本：`scripts/release/generate-homebrew-formula.sh`
3. Tap 推送脚本：`scripts/release/publish-formula-to-tap.sh`
4. 自动发布工作流：`.github/workflows/release.yml`
   - 触发条件：推送 tag（`v*`）
   - 产物：`darwin-arm64` / `darwin-amd64` / `linux-amd64` 二进制压缩包 + `checksums.txt` + `abc.rb`

## 你需要做的事（一次性）

1. 创建 tap 仓库（推荐命名）：
   - `https://github.com/<your-org-or-user>/homebrew-cli`
2. 在当前仓库设置 GitHub Actions Secrets：
   - `HOMEBREW_TAP_REPO`：`<your-org-or-user>/homebrew-cli`
   - `HOMEBREW_TAP_TOKEN`：可写入 tap 仓库的 token（repo 权限）
3. 确保当前仓库有 Release 写权限（Actions 默认 `contents: write` 已在 workflow 配置）

## 发布流程（每个版本）

1. 打 tag 并推送：

```bash
git tag v0.1.0
git push origin v0.1.0
```

2. Actions 自动执行：
   - 编译各平台可执行文件
   - 生成 checksums
   - 生成 `abc.rb`
   - 发布 GitHub Release
   - 若 secrets 完整，自动提交 `Formula/abc.rb` 到 tap 仓库

3. 用户安装：

```bash
brew install <your-org-or-user>/cli/abc
```

说明：Homebrew 会把 `homebrew-cli` 简写为 `cli`，所以命令是 `<owner>/cli/abc`。

## 本地手动验证（可选）

1. 构建当前机器二进制包：

```bash
bun run release:build -- v0.1.0
```

2. 生成 Homebrew formula（需准备 checksums 文件）：

```bash
bun run release:formula -- \
  --tag v0.1.0 \
  --repo <owner>/<repo> \
  --checksums dist/release/checksums.txt \
  --output dist/release/abc.rb
```

## 产物命名约定

- `abc-<version>-darwin-arm64.tar.gz`
- `abc-<version>-darwin-amd64.tar.gz`
- `abc-<version>-linux-amd64.tar.gz`

`version` 为去掉 `v` 前缀后的版本号，例如 tag `v0.1.0` -> `0.1.0`。
