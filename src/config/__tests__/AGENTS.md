<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-07 | Updated: 2026-04-07 -->

# __tests__ (config)

## Purpose
配置模块单元测试。测试 `loadConfig` 函数的各种场景：有效配置、缺失字段、无效白名单、文件读取错误。

## Key Files

| File | Description |
|------|-------------|
| `config.test.ts` | 测试 loadConfig：成功加载、缺失 addr/socks_addr、无效 whitelist、文件不存在 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| 无子目录 | |

## For AI Agents

### Working In This Directory
- 使用 Vitest 测试框架 (`describe`, `it`, `expect`)
- 测试文件使用 `.test.ts` 后缀
- 需要 mock 文件系统操作

### Testing Requirements
- 运行 `bun test` 或 `bun test:run`
- 测试覆盖率通过 `bun test:coverage` 查看

### Common Patterns
- 使用临时文件测试配置加载
- 测试错误消息格式
- 测试必填字段验证逻辑

## Dependencies

### Internal
- `../config.ts` - loadConfig 函数

### External
- `vitest` - 测试框架

<!-- MANUAL: -->