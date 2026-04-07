<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-07 | Updated: 2026-04-07 -->

# server

## Purpose
HTTP/HTTPS 代理服务器实现。启动 HTTP 服务器，处理 HTTP 请求和 HTTPS CONNECT 隧道，配置超时和优雅关闭。

## Key Files

| File | Description |
|------|-------------|
| `proxy-server.ts` | `startProxy()` 函数：创建 HTTP 服务器、处理 connect/http 事件、超时配置、错误处理 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| 无子目录 | |

## For AI Agents

### Working In This Directory
- `startProxy` 是唯一导出函数，在工作进程中被调用
- 服务器超时：60s socket timeout, 30s keepAlive
- 监听 `connect` 事件处理 HTTPS 隧道
- 监听普通请求处理 HTTP 流量

### Testing Requirements
- 需要 mock http.createServer
- 测试服务器启动、错误处理、超时行为

### Common Patterns
- `initializeWhitelist(config.whitelist)` 初始化白名单
- `parseAddress` 解析监听地址和 SOCKS5 地址
- 优雅关闭：SIGTERM/SIGINT → process.exit(0)
- 错误处理：EADDRINUSE/EACCES → process.exit(1)

## Dependencies

### Internal
- `../handlers/connect-handler` - handleConnect
- `../handlers/http-handler` - handleHttpRequest
- `../utils/logger` - 日志记录
- `../utils/utils` - parseAddress
- `../utils/whitelist` - initializeWhitelist
- `../config/types` - Config

### External
- `node:http` - HTTP 服务器
- `node:net` - Socket 类型

<!-- MANUAL: -->