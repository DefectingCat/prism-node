<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-07 | Updated: 2026-04-07 -->

# handlers

## Purpose
HTTP 和 HTTPS 请求处理器。支持 SOCKS5 代理转发和白名单域名直连，处理双向数据流转发。

## Key Files

| File | Description |
|------|-------------|
| `connect-handler.ts` | HTTPS CONNECT 隧道处理：SOCKS5/直连隧道、双向数据转发、传输量统计 |
| `http-handler.ts` | HTTP 请求转发：解析 URL、SOCKS5/直连请求、响应解析、故障回退 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| 无子目录 | |

## For AI Agents

### Working In This Directory
- `handleConnect` 处理 HTTPS CONNECT 请求
- `handleHttpRequest` 处理普通 HTTP 请求
- 白名单域名会自动直连（绕过 SOCKS5）
- EBADF 错误时自动回退到 SOCKS5

### Testing Requirements
- 需要 mock SocksClient 和 net.Socket
- 测试白名单直连、SOCKS5 转发、错误处理

### Common Patterns
- `safeSocketWrite` / `safeSocketDestroy` 安全套接字操作
- `generateRequestId` 用于日志追踪
- 双向数据流：clientSocket ↔ targetSocket
- 响应解析：手动解析 HTTP 响应头和状态码

## Dependencies

### Internal
- `../utils/logger` - 日志记录
- `../utils/utils` - generateRequestId, formatBytes
- `../utils/whitelist` - isDomainInWhitelist, excludeFromWhitelist
- `../config/types` - ParsedAddress

### External
- `socks` - SocksClient SOCKS5 连接
- `node:http` - HTTP 请求/响应类型
- `node:net` - TCP 套接字操作

<!-- MANUAL: -->