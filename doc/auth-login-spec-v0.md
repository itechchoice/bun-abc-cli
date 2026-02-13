# CLI 登录规范 v0（会后草案）

- 记录时间：2026-02-13
- 适用项目：`/Users/hejin/Documents/happy-2026/abc-cli`
- 技术栈基线：`OpenTUI + React + TypeScript + Bun`
- 治理边界：CLI 属于 `Interaction Surface + Observation/Query`，不承担决策、调度、执行权。

## 1. 目标

在后端正式接口上线前，冻结 CLI 登录体验与安全约束，确保后续接口接入不改用户心智。

## 2. 登录命令（v0）

```bash
abc auth login [--endpoint <url>]
abc auth logout
abc auth whoami
```

### 2.1 `abc auth login`

仅支持交互式输入：
- 输入用户名
- 输入密码（必须遮罩显示）

示例：

```bash
abc auth login
```

## 3. 安全要求（冻结）

1. 禁止非交互凭证参数
- 不支持 `--username`、`--password`、`--password-stdin`。
- 避免凭证进入 shell history / 进程列表 / CI 日志。

2. 本地仅保存 token，不保存明文密码。

3. token 文件权限最小化
- 建议 `0600`。

4. 错误输出脱敏
- 不打印密码、token、Authorization 头。

## 4. 会话与生命周期

1. 登录成功后保存 access token（可含 refresh token）。
2. `abc auth whoami` 用于验证当前 token 是否有效。
3. `abc auth logout` 删除本地 token 缓存。
4. 多环境支持
- `--endpoint` 临时覆盖
- 后续通过 `abc config set endpoint <url>` 固化默认值。

## 5. 错误语义（CLI 层）

统一错误输出建议：

- `AUTH_INVALID_CREDENTIALS`：账号或密码错误
- `AUTH_UNAUTHORIZED`：token 无效或过期
- `AUTH_FORBIDDEN`：账号无权限
- `NETWORK_TIMEOUT`：请求超时
- `NETWORK_UNREACHABLE`：网络不可达
- `SERVER_UNAVAILABLE`：服务不可用

## 6. 与后端待对齐项（接口前置）

1. 登录 endpoint 与请求体字段名（username/password）。
2. token 响应结构（access_token/refresh_token/expires_in）。
3. 刷新接口是否提供、何时刷新。
4. `whoami` 返回字段（user_id/account/roles/project_scope）。
5. 失败错误码与 message 规范。

## 7. 非目标（本轮不做）

1. SSO/OAuth 第三方登录。
2. 设备码登录。
3. 本地调度器相关鉴权逻辑（CLI 不实现调度内核）。
