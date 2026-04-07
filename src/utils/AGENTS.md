<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-07 | Updated: 2026-04-07 -->

# utils

## Purpose
工具函数模块：日志系统、域名白名单匹配、辅助函数。支持私有 IP 识别、通配符域名匹配、Winston 日志轮转。

## Key Files

| File | Description |
|------|-------------|
| `logger.ts` | Winston 日志：createLogger、configureLogger、DailyRotateFile |
| `whitelist.ts` | 域名白名单：初始化、匹配、私有 IP 检测、通配符支持、临时排除 |
| `utils.ts` | 辅助函数：generateRequestId、parseAddress、formatBytes、getTimestamp |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `__tests__/` | 工具函数单元测试 (see `__tests__/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `logger` 是全局单例，通过 `configureLogger` 添加文件传输
- 白名单支持：精确域名、通配符 `*.domain`、TLD 通配符
- `isPrivateIP` 自动识别私有 IP 地址（始终直连）

### Testing Requirements
- 测试文件在 `__tests__/` 子目录
- 白名单测试：精确匹配、通配符、私有 IP
- 日志测试：configureLogger 重复调用防护

### Common Patterns
- `isDomainInWhitelist(host)` - 检查是否直连
- `excludeFromWhitelist(host)` - 临时排除（故障回退）
- `resetWhitelist()` - 重置到初始状态
- 日志格式：JSON + timestamp + service: prism-node
- 文件轮转：error-%DATE%.log, combined-%DATE%.log

## Dependencies

### Internal
- `../config/types` - Config, ParsedAddress (logger.ts)

### External
- `winston` - 日志框架
- `winston-daily-rotate-file` - 日志轮转

<!-- MANUAL: -->