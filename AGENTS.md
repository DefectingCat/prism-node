<!-- Generated: 2026-04-07 | Updated: 2026-04-07 -->

# prism-node

## Purpose
轻量级 HTTP/HTTPS 代理服务器，通过 Node.js Cluster 多进程负载均衡转发流量到 SOCKS5 代理。支持域名白名单直连、Winston 日志系统、优雅关闭。

## Key Files

| File | Description |
|------|-------------|
| `package.json` | 项目依赖和脚本配置 |
| `tsconfig.json` | TypeScript 编译配置 |
| `biome.json` | Biome 代码格式化和 lint 配置 |
| `vitest.config.ts` | Vitest 测试框架配置 |
| `config.example.json` | 配置文件示例模板 |
| `config.json` | 运行时配置（需手动创建） |
| `README.md` | 英文项目文档 |
| `README-zh.md` | 中文项目文档 |
| `CLAUDE.md` | Claude Code 开发指南 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | TypeScript 源代码 (see `src/AGENTS.md`) |
| `dist/` | 编译输出目录 |
| `coverage/` | 测试覆盖率报告 |
| `node_modules/` | NPM 依赖包 |

## For AI Agents

### Working In This Directory
- 使用 Bun 作为运行时和构建工具
- 运行 `bun install` 安装依赖
- 配置文件使用 JSON5 格式（支持注释）
- 修改配置选项时同步更新 `src/config/types.ts`

### Testing Requirements
- 运行 `bun test` 执行测试
- 运行 `bun test:coverage` 生成覆盖率报告
- 确保测试通过后再提交

### Common Patterns
- Cluster 多进程架构：主进程管理工作进程
- Winston 日志：文件轮转 + 控制台输出
- 命令行参数：yargs 解析 `-c` (配置) `-g` (生成配置)

## Dependencies

### Internal
- `src/config/` - 配置加载和类型定义
- `src/handlers/` - HTTP/HTTPS 请求处理
- `src/server/` - 代理服务器实现
- `src/utils/` - 日志、白名单、工具函数

### External
- `bun` - 运行时环境
- `typescript` - 类型系统
- `vitest` - 测试框架
- `biome` - 代码质量工具
- `winston` - 日志系统
- `socks` - SOCKS5 客户端
- `yargs` - CLI 参数解析
- `json5` - 配置文件解析

<!-- MANUAL: -->