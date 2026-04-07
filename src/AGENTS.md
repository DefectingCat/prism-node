<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-07 | Updated: 2026-04-07 -->

# src

## Purpose
TypeScript 源代码目录，包含代理服务器的核心实现：配置加载、请求处理、服务器启动和工具函数。

## Key Files

| File | Description |
|------|-------------|
| `main.ts` | 主入口：Cluster 多进程管理、CLI 参数解析、配置生成 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `config/` | 配置加载和类型定义 (see `config/AGENTS.md`) |
| `handlers/` | HTTP/HTTPS 请求处理器 (see `handlers/AGENTS.md`) |
| `server/` | 代理服务器实现 (see `server/AGENTS.md`) |
| `utils/` | 日志、白名单、工具函数 (see `utils/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 入口点是 `main.ts`，不要直接修改 Cluster 逻辑
- 新功能应该在 handlers 或 utils 中添加
- 配置变更需要同步更新 `config/types.ts`

### Testing Requirements
- 测试文件放在对应模块的 `__tests__/` 子目录
- 运行 `bun test` 或 `bun test:run`

### Common Patterns
- Cluster 架构：主进程 fork 工作进程，工作进程调用 `startProxy`
- Winston 日志：通过 `configureLogger(config)` 初始化
- CLI：yargs 解析 `-c` (配置路径)、`-g` (生成配置)、`-o` (输出文件)

## Dependencies

### Internal
- 所有子模块相互独立，通过 `main.ts` 协调

### External
- `cluster` - Node.js 多进程
- `yargs` - CLI 参数解析
- `winston` - 日志系统

<!-- MANUAL: -->