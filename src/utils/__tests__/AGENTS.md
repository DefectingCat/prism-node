<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-07 | Updated: 2026-04-07 -->

# __tests__ (utils)

## Purpose
工具函数单元测试。测试 `parseAddress`、`generateRequestId`、`formatBytes`、`getTimestamp` 等辅助函数。

## Key Files

| File | Description |
|------|-------------|
| `utils.test.ts` | 测试 parseAddress：有效地址、无效格式、边界情况 |
| `whitelist.test.ts` | 测试白名单：精确匹配、通配符、私有 IP、临时排除、重置 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| 无子目录 | |

## For AI Agents

### Working In This Directory
- 使用 Vitest 测试框架
- 白名单测试覆盖多种匹配场景
- 测试私有 IP 识别（IPv4/IPv6）

### Testing Requirements
- 运行 `bun test` 或 `bun test:run`
- whitelist 测试需要调用 `initializeWhitelist` 初始化

### Common Patterns
- 白名单测试：`describe` 分组测试不同匹配类型
- 私有 IP：10.x, 172.16-31.x, 192.168.x, 127.x, fd00::, fe80::, ::1
- 边界测试：空字符串、无效 IP

## Dependencies

### Internal
- `../utils.ts` - parseAddress, generateRequestId, formatBytes
- `../whitelist.ts` - isDomainInWhitelist, isPrivateIP, initializeWhitelist

### External
- `vitest` - 测试框架

<!-- MANUAL: -->