<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-07 | Updated: 2026-04-07 -->

# config

## Purpose
配置加载和类型定义模块。使用 JSON5 解析配置文件（支持注释和尾随逗号），验证必填字段和白名单格式。

## Key Files

| File | Description |
|------|-------------|
| `config.ts` | `loadConfig()` 函数：读取 JSON5 文件，验证 addr/socks_addr/whitelist |
| `types.ts` | `Config` 和 `ParsedAddress` 接口定义 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `__tests__/` | 配置模块单元测试 (see `__tests__/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 添加新配置字段时必须更新 `types.ts` 接口
- 在 `config.ts` 的 `loadConfig()` 中添加验证逻辑
- 配置文件使用 JSON5 格式，支持注释

### Testing Requirements
- 测试文件在 `__tests__/` 子目录
- 测试无效配置、缺失字段、无效白名单等场景

### Common Patterns
- `ParsedAddress` 用于解析 `host:port` 格式地址
- 配置验证在加载时抛出 Error，由调用方捕获

## Dependencies

### Internal
- 无内部依赖

### External
- `json5` - JSON5 解析器
- `node:fs/promises` - 异步文件读取

<!-- MANUAL: -->