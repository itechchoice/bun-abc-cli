# Platform API 文档

> Base URL：`https://dychoice.stg.alphabitcore.io/api/v1`（以下用 `${BASE_URL}` 代替）
>
> 认证：除登录和 OAuth2 回调外，所有接口需携带 Header `Authorization: Bearer <access_token>`
>
> 多租户：数据按 `tenant_id` 自动隔离，无需手动传递

---

## 一、Auth

### 1.1 用户登录

`POST /api/v1/auth/login`

**入参**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `username` | `string` | 是 | 用户名 |
| `password` | `string` | 是 | 密码 |

**出参**：`access_token`（JWT）、`token_type`（固定 `Bearer`）、`expires_in`（秒）、`refresh_token`（可选）

```bash
curl -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user123", "password": "password456"}'
```

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.2 刷新令牌

`POST /api/v1/auth/refresh`

使用 `refresh_token` 换取新的令牌对。刷新后原 `refresh_token` 失效（每次返回新的一对）。

**入参**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `refresh_token` | `string` | 是 | 登录或上次刷新时获得的 refresh_token |

**出参**：`access_token`、`refresh_token`（新）、`token_type`（固定 `Bearer`）、`expires_in`（access_token 有效期，秒）、`refresh_expires_in`（refresh_token 有效期，秒）

```bash
curl -X POST ${BASE_URL}/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_expires_in": 604800
}
```

> **注意**：此接口无需 `Authorization` 头（refresh_token 本身携带身份信息）。若 refresh_token 无效或已过期，返回 `400`。

---

## 二、MCP Server 管理

基路径：`/api/v1/mcp/servers`

数据存储在 `governance_mcp_servers` 表，唯一约束 `(tenant_id, server_code, version)`。

### 2.1 注册 MCP Server

`POST /api/v1/mcp/servers`

注册一个 MCP Server 并触发首次能力同步。

**入参**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `server_code` | `string` | 是 | 服务编码（租户内唯一，同一编码可多版本） |
| `version` | `string` | 是 | 版本号 |
| `name` | `string` | 是 | 显示名称 |
| `description` | `string` | 否 | 描述信息 |
| `endpoint` | `string` | 是 | MCP Server 端点地址 |
| `auth_type` | `string` | 是 | 认证类型：`NONE`、`API_KEY`、`BASIC`、`OAUTH2`、`JWT`、`CUSTOM` |
| `auth_config` | `object` | 是 | 认证配置（格式见 2.6） |

**出参**：完整的 MCP Server 对象（含 `id`、`status`、`cache_version` 等）

```bash
curl -X POST ${BASE_URL}/mcp/servers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "server_code": "weather_mcp",
    "version": "v1",
    "name": "Weather Service",
    "endpoint": "https://weather-mcp.example.com/sse",
    "auth_type": "API_KEY",
    "auth_config": {
      "headers": {"X-API-Key": "sk-xxx"}
    }
  }'
```

```json
{
  "id": 1,
  "server_code": "weather_mcp",
  "version": "v1",
  "name": "Weather Service",
  "endpoint": "https://weather-mcp.example.com/sse",
  "auth_type": "API_KEY",
  "status": "active",
  "cache_version": 1,
  "last_sync_at": "2025-02-13T10:00:00",
  "created_at": "2025-02-13T10:00:00"
}
```

### 2.2 查询 MCP Server 列表

`GET /api/v1/mcp/servers`

**查询参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `server_code` | `string` | 否 | 按编码过滤 |
| `status` | `string` | 否 | 按状态过滤：`ACTIVE`、`INACTIVE` |

**出参**：数组，每项含 `id`、`server_code`、`version`、`name`、`endpoint`、`auth_type`、`auth_config`、`status`、`connection_status`

> `connection_status` 为当前登录用户对该 Server 的认证连接状态：`ACTIVE`（已连接）、`PENDING`（凭证失效，待重新认证）、`DISABLED`（手动禁用）、`null`（未连接）。通过 JWT 自动获取 `userId`，无需前端传参。

```bash
curl -X GET ${BASE_URL}/mcp/servers -H "Authorization: Bearer <token>"
```

```json
[
  {
    "id": 8,
    "server_code": "advizorpro",
    "version": "v1",
    "name": "AdvizorPro",
    "endpoint": "https://mcp.api.advizorpro.com",
    "auth_type": "API_KEY",
    "auth_config": { "headers": [{ "key": "Authorization", "prefix": "Bearer ", "..." : "..." }] },
    "status": "ACTIVE",
    "connection_status": "ACTIVE",
    "cache_version": 1,
    "last_sync_at": "2026-02-16T01:00:00",
    "created_at": "2026-02-16T00:49:50"
  },
  {
    "id": 9,
    "server_code": "github",
    "version": "v1",
    "name": "GitHub",
    "endpoint": "https://mcp.github.com",
    "auth_type": "OAUTH2",
    "auth_config": { "..." : "..." },
    "status": "ACTIVE",
    "connection_status": null,
    "cache_version": 0,
    "last_sync_at": null,
    "created_at": "2026-02-16T01:00:00"
  }
]
```

### 2.3 查询 MCP Server 详情

`GET /api/v1/mcp/servers/{id}`

返回完整信息，含 `auth_config` 和当前用户的 `connection_status`。

```bash
curl -X GET ${BASE_URL}/mcp/servers/8 -H "Authorization: Bearer <token>"
```

### 2.4 更新 MCP Server

`PUT /api/v1/mcp/servers/{id}`

可更新 `name`、`description`、`endpoint`、`auth_type`、`auth_config`。`server_code` 和 `version` 不可修改。

```bash
curl -X PUT ${BASE_URL}/mcp/servers/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Weather Service v2", "endpoint": "https://new-endpoint.example.com/sse"}'
```

### 2.5 删除 MCP Server

`DELETE /api/v1/mcp/servers/{id}`

级联删除关联的能力记录和同步日志。

```bash
curl -X DELETE ${BASE_URL}/mcp/servers/1 -H "Authorization: Bearer <token>"
```

### 2.6 auth_config 格式说明

`auth_config` 是管理员注册 MCP Server 时提供的**服务器级认证配置**，结构取决于 `auth_type`。它同时承担两个职责：

1. **前端渲染**：告诉 Web 界面在用户连接时渲染什么表单字段（字段名、描述、是否敏感等）
2. **运行时注入**：告诉 Execution Plane 如何将用户凭证注入到 HTTP 请求中（Header 名、前缀等）

> **auth_config vs mcp_connections.credentials 的关系**：
> - `auth_config`：**服务器级配置**，管理员注册时填写，定义"需要什么凭证、怎么使用"
> - `mcp_connections.credentials`：**用户级凭证**，终端用户连接时填写，存储实际的凭证值

---

#### NONE

无认证，不需要配置。

```json
{}
```

---

#### API_KEY

通过自定义 HTTP Header 传递 API Key。

```json
{
  "headers": [
    {
      "key": "Authorization",
      "name": "API Key",
      "type": "string",
      "prefix": "Bearer ",
      "required": true,
      "sensitive": true,
      "description": "Your API key from the dashboard",
      "placeholder": "sk-..."
    }
  ]
}
```

**另一种样例**（自定义 Header 名，无前缀）：

```json
{
  "headers": [
    {
      "key": "X-API-Key",
      "name": "API Key",
      "type": "string",
      "prefix": "",
      "required": true,
      "sensitive": true,
      "description": "Your API key",
      "placeholder": "Enter your API key"
    }
  ]
}
```

**用户 credentials 存储格式**：

```json
{
  "headers": {
    "Authorization": "sk-abc123"
  }
}
```

**运行时注入**：`Authorization: Bearer sk-abc123`（`prefix` + 用户值）

---

#### CUSTOM

完全自定义的认证方式，支持任意 Header 组合和固定查询参数。适用于需要多个自定义 Header 或附加查询参数的场景。

```json
{
  "headers": [
    {
      "key": "X-API-Token",
      "name": "API Token",
      "type": "string",
      "prefix": "",
      "required": true,
      "sensitive": true,
      "description": "Your API token",
      "placeholder": "tok_..."
    },
    {
      "key": "X-Email",
      "name": "Email",
      "type": "string",
      "prefix": "",
      "required": true,
      "sensitive": false,
      "description": "Your registered email",
      "placeholder": "user@example.com"
    }
  ],
  "queryParams": [
    {
      "key": "api_version",
      "value": "v2"
    }
  ]
}
```

| 顶层字段 | 必填 | 说明 |
|---------|-----|------|
| `headers` | 否 | 自定义 HTTP Header 列表，用户填值 |
| `queryParams` | 否 | 固定查询参数列表，管理员配置，用户不可见 |

**用户 credentials 存储格式**：

```json
{
  "headers": {
    "X-API-Token": "tok_abc123",
    "X-Email": "user@example.com"
  }
}
```

**运行时注入**：设置所有 headers + 追加 queryParams 到请求 URL。

---

#### OAUTH2

标准 OAuth2 Authorization Code 流程，系统自动管理 token 获取和刷新。

**样例 1**：完整配置（手动指定所有端点）

```json
{
  "authUrl": "https://dev-123456.okta.com/oauth2/default/v1/authorize",
  "tokenUrl": "https://dev-123456.okta.com/oauth2/default/v1/token",
  "refreshUrl": "https://dev-123456.okta.com/oauth2/default/v1/token",
  "clientId": "0oawa3xdyv5I8qbCb697",
  "clientSecret": "",
  "redirectUri": "https://our-app.com/api/v1/mcp/auth/callback",
  "scopes": ["openid", "profile", "email", "offline_access"],
  "grantType": "authorization_code",
  "responseType": "code",
  "pkce": true
}
```

**样例 2**：OIDC Discovery 最简配置（通过 `issuerUrl` 自动发现端点）

```json
{
  "issuerUrl": "https://dev-123456.okta.com/oauth2/default",
  "clientId": "0oawa3xdyv5I8qbCb697",
  "clientSecret": "",
  "redirectUri": "https://our-app.com/api/v1/mcp/auth/callback",
  "scopes": ["openid", "profile", "offline_access"],
  "pkce": true
}
```

> 提供 `issuerUrl` 时，系统通过 `{issuerUrl}/.well-known/openid-configuration` 自动发现 `authUrl`、`tokenUrl`、`refreshUrl`。如果同时显式提供了具体端点，以显式配置为准。

| 字段 | 必填 | 说明 |
|------|-----|------|
| `clientId` | 是 | OAuth2 客户端 ID |
| `redirectUri` | 是 | 回调地址 |
| `issuerUrl` | 否* | OIDC Issuer URL，支持自动发现端点（`authUrl`、`tokenUrl`、`refreshUrl`） |
| `authUrl` | 否* | 授权端点 |
| `tokenUrl` | 否* | Token 交换端点 |
| `clientSecret` | 否 | 客户端密钥（公开客户端 + PKCE 时可省略） |
| `refreshUrl` | 否 | Token 刷新端点，默认同 `tokenUrl` |
| `scopes` | 否 | 授权范围列表 |
| `grantType` | 否 | 默认 `authorization_code` |
| `responseType` | 否 | 默认 `code` |
| `pkce` | 否 | 是否启用 PKCE，默认 `false` |

> *`issuerUrl` 与 `authUrl`/`tokenUrl` 二选一：提供 `issuerUrl` 时可省略端点配置；不提供 `issuerUrl` 时 `authUrl` 和 `tokenUrl` 必填。

**样例 3**（带 Client Secret、无 PKCE，如 GitHub）：

```json
{
  "authUrl": "https://github.com/login/oauth/authorize",
  "tokenUrl": "https://github.com/login/oauth/access_token",
  "refreshUrl": "",
  "clientId": "Iv1.a1b2c3d4e5f6",
  "clientSecret": "secret_abcdef1234567890",
  "redirectUri": "https://our-app.com/api/v1/mcp/auth/callback",
  "scopes": ["repo", "read:user"],
  "grantType": "authorization_code",
  "responseType": "code",
  "pkce": false
}
```

**前端行为**：不渲染输入表单，只展示"授权"按钮，点击后跳转 OAuth2 授权流程。

**系统自动管理的 credentials 格式**：

```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "dGhpcyBpc...",
  "token_type": "Bearer",
  "expires_at": "2026-02-16T10:30:00"
}
```

**运行时注入**：`Authorization: Bearer <access_token>`，过期自动刷新。

---

#### BASIC

标准 HTTP Basic 认证。`fields` 定义用户需要填写的表单字段，管理员可自定义标签。如果 `auth_config` 为 `{}`，前端 fallback 到默认的 username + password 字段。

```json
{
  "fields": [
    {
      "key": "username",
      "name": "Username",
      "type": "string",
      "required": true,
      "sensitive": false,
      "description": "Your account username",
      "placeholder": "admin"
    },
    {
      "key": "password",
      "name": "Password",
      "type": "string",
      "required": true,
      "sensitive": true,
      "description": "Your account password",
      "placeholder": "Enter password"
    }
  ]
}
```

**另一种样例**（如 Jira 使用邮箱 + API Token 作为 Basic 认证）：

```json
{
  "fields": [
    {
      "key": "username",
      "name": "Email",
      "type": "string",
      "required": true,
      "sensitive": false,
      "description": "Your Atlassian account email",
      "placeholder": "user@company.com"
    },
    {
      "key": "password",
      "name": "API Token",
      "type": "string",
      "required": true,
      "sensitive": true,
      "description": "Generate from https://id.atlassian.com/manage-profile/security/api-tokens",
      "placeholder": "ATATT3x..."
    }
  ]
}
```

**用户 credentials 存储格式**：

```json
{
  "username": "user@company.com",
  "password": "ATATT3x..."
}
```

**运行时注入**：`Authorization: Basic base64(username:password)`，固定行为。

---

#### JWT

用于"非标准 OAuth2 但需要 token + refresh 机制"的场景。用户手动提供初始 token 和 refresh token，系统负责自动刷新。

```json
{
  "tokenUrl": "https://api.example.com/auth/refresh",
  "headers": [
    {
      "key": "Authorization",
      "name": "Access Token",
      "type": "string",
      "prefix": "Bearer ",
      "required": true,
      "sensitive": true,
      "description": "Your JWT access token",
      "placeholder": "eyJhbGciOiJSUzI1NiIs..."
    }
  ],
  "fields": [
    {
      "key": "refresh_token",
      "name": "Refresh Token",
      "type": "string",
      "required": true,
      "sensitive": true,
      "description": "Your refresh token for automatic renewal",
      "placeholder": "dGhpcyBp..."
    }
  ]
}
```

| 字段 | 必填 | 说明 |
|------|-----|------|
| `tokenUrl` | 否 | Token 刷新端点（提供时启用自动刷新） |
| `headers` | 是 | 需要注入的 HTTP Header 定义 |
| `fields` | 否 | 额外的用户输入字段（如 refresh_token） |

**如果不需要自动刷新**（纯静态 token），简化为：

```json
{
  "headers": [
    {
      "key": "Authorization",
      "name": "JWT Token",
      "type": "string",
      "prefix": "Bearer ",
      "required": true,
      "sensitive": true,
      "description": "Your signed JWT token",
      "placeholder": "eyJhbGciOiJIUzI1NiIs..."
    }
  ]
}
```

> **JWT vs API_KEY 的区别**：配置格式相似，但 JWT 类型支持 `tokenUrl` + `fields.refresh_token` 实现自动刷新，API_KEY 不具备此能力。如果只是传一个静态 token，用 API_KEY 即可。

**用户 credentials 存储格式**：

```json
{
  "headers": {
    "Authorization": "eyJhbGci..."
  },
  "refresh_token": "dGhpcyBp..."
}
```

**运行时注入**：`Authorization: Bearer eyJhbGci...`，配置了 `tokenUrl` 时过期自动刷新。

---

#### headers 字段定义

API_KEY、JWT、CUSTOM 共用同一个 `headers[]` 结构：

| 字段 | 类型 | 必填 | 说明 |
|------|------|-----|------|
| `key` | string | 是 | HTTP Header 名称 |
| `name` | string | 是 | 前端显示标签 |
| `type` | string | 否 | 字段类型，默认 `string` |
| `prefix` | string | 否 | 值前缀（如 `Bearer `），默认 `""` |
| `required` | boolean | 否 | 是否必填，默认 `true` |
| `sensitive` | boolean | 否 | 是否敏感（密码框输入 + 脱敏回显），默认 `false` |
| `description` | string | 否 | 帮助文本 |
| `placeholder` | string | 否 | 输入框占位符 |

#### fields 字段定义

BASIC、JWT 使用 `fields[]` 收集非 Header 类型的用户输入：

| 字段 | 类型 | 必填 | 说明 |
|------|------|-----|------|
| `key` | string | 是 | 字段标识（存入 credentials 的 key） |
| `name` | string | 是 | 前端显示标签 |
| `type` | string | 否 | 字段类型，默认 `string` |
| `required` | boolean | 否 | 是否必填，默认 `true` |
| `sensitive` | boolean | 否 | 是否敏感（密码框输入 + 脱敏回显），默认 `false` |
| `description` | string | 否 | 帮助文本 |
| `placeholder` | string | 否 | 输入框占位符 |

### 2.7 同步能力

`POST /api/v1/mcp/servers/{id}/sync`

连接 MCP Server 端点，拉取最新的 Tool 列表，更新 `governance_capabilities` 表，递增 `cache_version`。

**出参**：`cache_version`（新版本号）、`capabilities_count`（同步后的能力总数）、`diff`（新增/移除/变更的能力）

```bash
curl -X POST ${BASE_URL}/mcp/servers/1/sync -H "Authorization: Bearer <token>"
```

```json
{
  "cache_version": 2,
  "capabilities_count": 5,
  "diff": {
    "added": ["weather.forecast", "weather.current"],
    "removed": [],
    "updated": ["weather.history"]
  }
}
```

### 2.8 查询能力列表

`GET /api/v1/mcp/servers/{id}/capabilities`

返回该 MCP Server 的所有已注册能力。

**出参**：数组，每项含 `id`、`name`、`description`、`input_schema`、`output_schema`、`status`

```bash
curl -X GET ${BASE_URL}/mcp/servers/1/capabilities -H "Authorization: Bearer <token>"
```

```json
[
  {
    "id": 10,
    "name": "weather.forecast",
    "description": "Get weather forecast for a location",
    "input_schema": {"type": "object", "properties": {"city": {"type": "string"}}},
    "output_schema": {"type": "object", "properties": {"forecast": {"type": "array"}}},
    "status": "active"
  }
]
```

---

## 三、MCP Server 认证连接

基路径：`/api/v1/mcp/servers/{id}/auth`

当 MCP Server 的 `auth_type` 需要用户介入（如 OAuth2 授权、用户级 API Key 等）时，通过此模块管理认证凭证。

> **与 auth_config 的关系**：
> - `auth_config`：服务器级配置——OAuth2 端点、客户端凭证、Key 格式要求等（管理员注册时填写）
> - 本模块：租户/用户级凭证——实际的 access_token、用户自己的 API Key 等（使用者授权时填写）

### 3.1 发起认证

`POST /api/v1/mcp/servers/{id}/auth`

根据 `auth_type` 行为不同：
- **OAUTH2**：返回 `302` 重定向到第三方授权页面（基于 `auth_config` 中的 OAuth2 配置）
- **其他类型**：直接保存凭证，返回 JSON

**入参**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `connectionName` | `string` | 否 | 连接名称（区分同一 Server 的多个连接） |
| `returnUrl` | `string` | 否 | OAuth2 授权后回跳的前端 URL |
| `credentials` | `map` | 条件必填 | 认证凭证（非 OAuth2 类型必填） |

`credentials` 格式与 `auth_config` 相同（见 2.6），但这里填的是**用户实际的密钥/凭证**，而非服务器配置。

**出参（非 OAuth2）**：`success`、`connectionId`、`message`

**出参（OAuth2）**：HTTP 302 → 第三方授权页面

```bash
# API_KEY 类型 — 用户提交自己的 Key
curl -X POST ${BASE_URL}/mcp/servers/1/auth \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "connectionName": "Production Key",
    "credentials": {"headers": {"X-API-Key": "user-sk-xxx"}}
  }'
```

```json
{"success": true, "connectionId": 12345, "message": "Authentication successful"}
```

```bash
# OAuth2 类型 — 发起授权重定向（浏览器中发起）
curl -X POST ${BASE_URL}/mcp/servers/2/auth \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"returnUrl": "https://console.example.com/mcp/servers/2"}'
# → 302 Location: https://idp.example.com/oauth2/authorize?client_id=xxx&state=xxx&...
```

### 3.2 查询认证状态

`GET /api/v1/mcp/servers/{id}/auth`

查询当前租户对该 MCP Server 的认证状态。OAuth2 类型会自动刷新即将过期的 token（过期前 5 分钟触发刷新）。

**出参**：`authenticated`、`connectionId`、`connectionName`、`authType`、`credentials`（脱敏）、`expiresAt`

```bash
curl -X GET ${BASE_URL}/mcp/servers/2/auth -H "Authorization: Bearer <token>"
```

已认证：
```json
{
  "authenticated": true,
  "connectionId": 12345,
  "connectionName": "Production Key",
  "authType": "OAUTH2",
  "credentials": {
    "access_token": "ya29.a0Af...",
    "token_type": "Bearer",
    "expires_at": "2025-02-13T12:00:00Z"
  },
  "expiresAt": "2025-02-13T12:00:00Z"
}
```

未认证：
```json
{"authenticated": false, "authType": "OAUTH2"}
```

### 3.3 删除认证凭证

`DELETE /api/v1/mcp/servers/{id}/auth`

**查询参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `connectionId` | `long` | 否 | 指定删除某个连接（不传则删该 Server 下的所有连接） |

```bash
curl -X DELETE "${BASE_URL}/mcp/servers/2/auth?connectionId=12345" \
  -H "Authorization: Bearer <token>"
```

```json
{"success": true}
```

### 3.4 OAuth2 回调

`GET /api/v1/mcp/auth/callback`

**无需平台认证**（白名单接口）。由第三方授权服务器回调。

**查询参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `code` | `string` | 是 | 授权码 |
| `state` | `string` | 是 | 状态参数（Redis key，恢复上下文） |

**处理流程**：
1. 用 `state` 从 Redis 查找上下文（serverId、tenantId、userId、returnUrl、code_verifier）
2. 从 `governance_mcp_servers.auth_config` 读取 OAuth2 配置（tokenUrl、clientId 等）
3. 用 `code` + `code_verifier`（如启用 PKCE）交换 access_token / refresh_token
4. 保存凭证到连接记录
5. 302 重定向回前端

**出参**：HTTP 302

- 成功：`{returnUrl}?auth=success&connectionId=12345`
- 失败：`{returnUrl}?auth=error&message=Invalid+authorization+code`

### 3.5 OAuth2 完整流程

```
前端点击"授权连接"
  → POST /mcp/servers/{id}/auth (returnUrl=前端页面)
  → 后端从 governance_mcp_servers.auth_config 读取 OAuth2 配置
  → 生成 state + code_verifier(如启用 PKCE), 存 Redis(TTL 10min)
  → 302 → 第三方授权页面
  → 用户授权
  → 第三方回调 GET /mcp/auth/callback?code=xxx&state=xxx
  → 后端: 验证 state → 交换 token → 保存凭证
  → 302 → returnUrl?auth=success&connectionId=xxx
```

---

## 四、执行

> **职责分工**（对齐架构设计）：
> - **Session 管理**：Surface Ingress 负责，管理对话上下文与消息存储（`ingress_sessions` / `ingress_messages`）
> - **Task 生命周期**：Reconcile Plane 负责状态机推进（`reconcile_tasks`），Surface Ingress 代理转发外部请求
>
> **完整执行管线**：
> ```
> 用户提交消息 → Surface Ingress（写入消息 + 构建上下文）
>   → Governance Plane（获取可用能力 + 策略约束）
>   → Decision Plane（编译 EB + EP）
>   → Reconcile Plane（创建 Task，推进状态机）
>     → Execution Plane（执行具体步骤，通过 Execution Event 反馈）
> ```
>
> **Task 状态枚举**（与 `reconcile_tasks.status` 对齐）：
> ```
> CREATED → RUNNING → COMPLETED
>                  ├→ FAILED
>                  └→ CANCELLED
> ```
>
> **Step 状态枚举**（与 `reconcile_step_states.status` 对齐）：
> - `PENDING` → `RUNNING` → `COMPLETED` / `FAILED`

---

### 4.1 创建会话

`POST /api/v1/sessions`

创建一个新的对话会话，用于关联多轮对话的上下文。

**入参**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `title` | `string` | 否 | 会话标题（不传时后端可自动生成） |

**出参**：`session_id`、`created_at`

```bash
curl -X POST ${BASE_URL}/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "天气查询"}'
```

```json
{
  "session_id": 10001,
  "title": "天气查询",
  "status": "active",
  "created_at": "2026-02-13T10:00:00Z"
}
```

---

### 4.2 会话列表

`GET /api/v1/sessions`

返回当前用户的所有会话，按创建时间倒序排列。

**查询参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `status` | `string` | 否 | 按状态过滤：`active`、`archived` |
| `page` | `int` | 否 | 页码，默认 1 |
| `size` | `int` | 否 | 每页数量，默认 20 |

**出参**：分页的会话列表

```bash
curl -X GET "${BASE_URL}/sessions?status=active" \
  -H "Authorization: Bearer <token>"
```

```json
{
  "items": [
    {
      "session_id": 10001,
      "title": "天气查询",
      "status": "active",
      "message_count": 4,
      "last_message_at": "2026-02-13T10:05:00Z",
      "created_at": "2026-02-13T10:00:00Z"
    },
    {
      "session_id": 10002,
      "title": "代码分析",
      "status": "active",
      "message_count": 2,
      "last_message_at": "2026-02-13T11:00:00Z",
      "created_at": "2026-02-13T10:30:00Z"
    }
  ],
  "total": 2,
  "page": 1,
  "size": 20
}
```

---

### 4.3 会话详情（消息历史）

`GET /api/v1/sessions/{session_id}`

查询指定会话的消息历史，按 `sequence_number` 升序返回。

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `session_id` | `long` | 是 | 会话 ID |

**出参**：会话元信息 + 消息列表

```bash
curl -X GET ${BASE_URL}/sessions/10001 \
  -H "Authorization: Bearer <token>"
```

```json
{
  "session_id": 10001,
  "title": "天气查询",
  "status": "active",
  "created_at": "2026-02-13T10:00:00Z",
  "messages": [
    {
      "id": 1001,
      "role": "user",
      "content": "查询 San Francisco 三日天气",
      "task_id": 20001,
      "created_at": "2026-02-13T10:01:00Z"
    },
    {
      "id": 1002,
      "role": "assistant",
      "content": "San Francisco 未来三天天气：周一晴 15°C，周二多云 13°C，周三小雨 11°C。",
      "task_id": 20001,
      "created_at": "2026-02-13T10:01:05Z"
    },
    {
      "id": 1003,
      "role": "user",
      "content": "那 New York 呢？",
      "task_id": 20002,
      "created_at": "2026-02-13T10:05:00Z"
    },
    {
      "id": 1004,
      "role": "assistant",
      "content": null,
      "task_id": 20002,
      "task_status": "RUNNING",
      "created_at": "2026-02-13T10:05:01Z"
    }
  ]
}
```

> **说明**：当 `role` 为 `assistant` 且关联的 Task 尚未完成时，`content` 为 `null`，`task_status` 反映当前执行状态。

---

### 4.4 任务列表

`GET /api/v1/tasks`

返回当前用户所属租户的任务列表，支持按状态过滤，按创建时间倒序排列。

**查询参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `status` | `string` | 否 | 按状态过滤：`CREATED`、`RUNNING`、`PENDING_APPROVAL`、`COMPLETED`、`FAILED`、`CANCELLED`、`REJECTED` |
| `page` | `int` | 否 | 页码，默认 1 |
| `size` | `int` | 否 | 每页数量，默认 20 |

**出参**：分页的任务列表

```bash
curl -X GET "${BASE_URL}/tasks?status=RUNNING" \
  -H "Authorization: Bearer <token>"
```

```json
{
  "items": [
    {
      "taskId": 20001,
      "sessionId": 10001,
      "message": "查询 San Francisco 三日天气",
      "status": "RUNNING",
      "currentStepSequence": 2,
      "result": null,
      "error": null,
      "createdAt": "2026-02-13T10:01:00",
      "startedAt": "2026-02-13T10:01:01",
      "completedAt": null
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20
}
```

查询所有已完成的任务：

```bash
curl -X GET "${BASE_URL}/tasks?status=COMPLETED&page=1&size=10" \
  -H "Authorization: Bearer <token>"
```

```json
{
  "items": [
    {
      "taskId": 20002,
      "sessionId": 10001,
      "message": "查询 New York 天气",
      "status": "COMPLETED",
      "currentStepSequence": 2,
      "result": "New York 未来三天天气：周一晴 8°C，周二多云 6°C，周三小雨 4°C。",
      "error": null,
      "createdAt": "2026-02-13T10:05:00",
      "startedAt": "2026-02-13T10:05:01",
      "completedAt": "2026-02-13T10:05:05"
    }
  ],
  "total": 5,
  "page": 1,
  "size": 10
}
```

不传 `status` 则返回所有状态的任务：

```bash
curl -X GET "${BASE_URL}/tasks" -H "Authorization: Bearer <token>"
```

---

### 4.5 提交任务

`POST /api/v1/tasks`

提交用户消息，触发完整执行管线（Governance → Decision → Reconcile）。若不传 `session_id`，自动创建新会话。

**入参**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `message` | `string` | 是 | 用户消息内容（执行目标描述） |
| `session_id` | `long` | 否 | 关联的会话 ID；不传则自动创建新会话 |

**出参**：`task_id`、`session_id`、`status`

```bash
curl -X POST ${BASE_URL}/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "查询 San Francisco 三日天气", "session_id": 10001}'
```

```json
{
  "task_id": 20001,
  "session_id": 10001,
  "status": "CREATED"
}
```

> **后端处理流程**：
> 1. 若无 `session_id`，创建新的 Session 并返回
> 2. 写入用户消息到 `ingress_messages`
> 3. 加载会话上下文（历史消息 + 上下文策略）
> 4. 构建 Business Contract（intent + context + constraints）
> 5. 调用 Governance Plane 获取可用能力列表 + 策略约束
> 6. 调用 Decision Plane 编译 Execution Blueprint (EB) + Execution Policy (EP)
> 7. 提交 EB + EP 到 Reconcile Plane，创建 Task（`reconcile_tasks`）
> 8. Reconcile Plane 开始状态机主动推进

---

### 4.6 任务事件流（SSE）

`GET /api/v1/tasks/{task_id}/events`

以 Server-Sent Events (SSE) 方式推送任务的实时执行状态。客户端应在提交任务后订阅此接口。

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `task_id` | `long` | 是 | 任务 ID |

**请求**：

```bash
curl -N -X GET ${BASE_URL}/tasks/20001/events \
  -H "Authorization: Bearer <token>" \
  -H "Accept: text/event-stream"
```

**连接行为**：

SSE 连接建立时，服务端会先查询任务当前状态，根据情况推送 catch-up 事件：

| 连接时任务状态 | 服务端行为 |
|---------------|-----------|
| `COMPLETED` / `FAILED` / `CANCELLED` | 立即推送终态事件（含完整 `steps` 历史），然后关闭连接 |
| `CREATED` / `RUNNING` | 推送 `task.catchup` 事件（含已完成步骤历史），然后持续推送后续实时事件 |

> 这意味着客户端可以在任何时候连接 SSE，无论任务刚提交还是已经执行到一半，都能收到完整的状态信息。

**事件类型与数据格式**：

| event 类型 | 说明 | data 主要字段 |
|------------|------|---------------|
| `task.catchup` | 连接时的状态快照（含步骤历史） | `task_id`, `status`, `current_step`, `steps` |
| `task.compiling` | Decision Plane 编译 EB 中 | `task_id`, `message` |
| `task.compiled` | EB 编译完成，步骤已冻结 | `task_id`, `steps_total` |
| `step.started` | 步骤开始执行 | `task_id`, `step_sequence`, `capability` |
| `step.completed` | 步骤执行成功 | `task_id`, `step_sequence` |
| `step.failed` | 步骤执行失败 | `task_id`, `step_sequence`, `error` |
| `task.completed` | 任务全部完成（含步骤历史） | `task_id`, `status`, `result`, `steps` |
| `task.failed` | 任务失败终止（含步骤历史） | `task_id`, `status`, `error`, `steps` |
| `task.cancelled` | 任务已取消 | `task_id`, `status` |
| `heartbeat` | 心跳保活（约 15s 间隔） | `timestamp` |

**事件流示例（正常流程 — 提交后立即连接）**：

```
event: task.catchup
data: {"task_id":20001,"status":"CREATED","current_step":0,"steps":[]}

event: task.compiling
data: {"task_id":20001,"message":"Parsing intent and compiling execution blueprint..."}

event: task.compiled
data: {"task_id":20001,"steps_total":2}

event: step.started
data: {"task_id":20001,"step_sequence":1,"capability":"weather_tool.get_forecast"}

event: step.completed
data: {"task_id":20001,"step_sequence":1}

event: step.started
data: {"task_id":20001,"step_sequence":2,"capability":"llm.respond"}

event: step.completed
data: {"task_id":20001,"step_sequence":2}

event: task.completed
data: {"task_id":20001,"status":"COMPLETED","result":"San Francisco 未来三天天气...","steps":[...]}

```

**事件流示例（中途连接 — 任务正在执行第 2 步）**：

```
event: task.catchup
data: {"task_id":20001,"status":"RUNNING","current_step":2,"steps":[{"sequence":1,"capability":"weather_tool.get_forecast","status":"COMPLETED","startedAt":"...","completedAt":"..."},{"sequence":2,"capability":"llm.respond","status":"RUNNING","startedAt":"...","completedAt":null}]}

event: step.completed
data: {"task_id":20001,"step_sequence":2}

event: task.completed
data: {"task_id":20001,"status":"COMPLETED","result":"...","steps":[...]}

```

**事件流示例（迟连接 — 任务已完成）**：

```
event: task.completed
data: {"task_id":20001,"status":"COMPLETED","result":"San Francisco 未来三天天气...","steps":[{"sequence":1,"capability":"weather_tool.get_forecast","status":"COMPLETED",...},{"sequence":2,"capability":"llm.respond","status":"COMPLETED",...}]}

```
> 任务已结束时，SSE 连接推送终态事件后立即关闭。

**事件流示例（失败场景）**：

```
event: task.catchup
data: {"task_id":20002,"status":"CREATED","current_step":0,"steps":[]}

event: task.compiled
data: {"task_id":20002,"steps_total":2}

event: step.started
data: {"task_id":20002,"step_sequence":1,"capability":"weather_tool.get_forecast"}

event: step.failed
data: {"task_id":20002,"step_sequence":1,"error":"Connection timeout to weather service"}

event: task.failed
data: {"task_id":20002,"status":"FAILED","error":"Step 1 failed: Connection timeout to weather service","steps":[...]}

```

> **说明**：
> - 任务进入终态（`task.completed` / `task.failed` / `task.cancelled`）推送后，服务端关闭 SSE 连接
> - 客户端可在任何时间点连接，都能通过 catch-up 获得完整状态
> - 建议客户端做好长连接管理和断线重连

---

### 4.7 查询任务详情

`GET /api/v1/tasks/{task_id}`

查询任务完整信息，包括 Execution Blueprint 步骤结构与各步骤运行状态。

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `task_id` | `long` | 是 | 任务 ID |

**出参**：任务元信息 + EB 步骤列表及状态

```bash
curl -X GET ${BASE_URL}/tasks/20001 \
  -H "Authorization: Bearer <token>"
```

```json
{
  "task_id": 20001,
  "session_id": 10001,
  "status": "RUNNING",
  "current_step_id": 2,
  "created_at": "2026-02-13T10:01:00Z",
  "started_at": "2026-02-13T10:01:01Z",
  "completed_at": null,
  "steps": [
    {
      "step_id": 1,
      "type": "EXECUTION",
      "sequence": 1,
      "capability": "weather_tool.get_forecast",
      "depends_on": [],
      "status": "COMPLETED",
      "started_at": "2026-02-13T10:01:01Z",
      "completed_at": "2026-02-13T10:01:03Z"
    },
    {
      "step_id": 2,
      "type": "EXECUTION",
      "sequence": 2,
      "capability": "llm.summarize",
      "depends_on": [1],
      "status": "RUNNING",
      "started_at": "2026-02-13T10:01:03Z",
      "completed_at": null
    }
  ]
}
```

---

### 4.8 取消任务

`POST /api/v1/tasks/{task_id}/cancel`

取消正在执行的任务。仅 `CREATED`、`RUNNING` 状态的任务可取消。

**路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `task_id` | `long` | 是 | 任务 ID |

```bash
curl -X POST ${BASE_URL}/tasks/20001/cancel \
  -H "Authorization: Bearer <token>"
```

```json
{
  "task_id": 20001,
  "status": "CANCELLED"
}
```

---

## 五、错误处理

| 状态码 | 说明 |
|--------|------|
| `200` | 成功 |
| `302` | 重定向（OAuth2 流程） |
| `400` | 请求参数错误 |
| `401` | 未授权 |
| `403` | 权限不足 |
| `404` | 资源不存在 |
| `409` | 冲突（如连接已存在、server_code+version 重复） |
| `500` | 服务器内部错误 |

错误响应格式：

```json
{"timestamp": "2025-02-13T10:00:00", "status": 400, "error": "Bad Request", "message": "具体错误描述", "path": "/api/v1/xxx"}
```
