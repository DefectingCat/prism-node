# Prism Node

一个轻量级的 HTTP/HTTPS 代理服务器，支持将流量转发到 SOCKS5 代理。

## 项目概述

Prism Node 是一个简洁而强大的代理服务器解决方案，基于 Node.js 和 TypeScript 构建。支持通过 SOCKS5 代理转发 HTTP 和 HTTPS 流量，并采用多进程负载均衡。

## 功能特性

### 核心代理功能
- **双协议支持**: 处理 HTTP 和 HTTPS 流量
- **SOCKS5 集成**: 将所有代理请求转发到配置的 SOCKS5 服务器
- **多进程负载均衡**: 根据 CPU 核心数自动创建工作进程，提升性能
- **优雅关闭**: 正确清理资源并退出（SIGTERM/SIGINT）
- **域名白名单**: 支持特定域名直连（绕过 SOCKS5）
- **请求追踪**: 每个请求都有唯一 ID 用于日志记录和调试
- **传输统计**: 记录每个连接的上传/下载字节数
- **完整日志**: 基于 Winston 的日志系统，支持日志文件轮转

## 安装

### 前置要求
- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

## 配置

1. 复制示例配置文件：

```bash
cp config.example.json config.json
```

2. 编辑 `config.json` 以匹配您的设置：

```json
{
  "addr": "127.0.0.1:10808",
  "socks_addr": "127.0.0.1:13659",
  "log_path": "./logs",
  "whitelist": ["example.com", "*.google.com"]
}
```

### 配置选项

| 字段 | 描述 | 必填 |
|------|------|------|
| `addr` | 代理服务器监听地址 | 是 |
| `socks_addr` | SOCKS5 服务器地址 | 是 |
| `log_path` | 日志文件路径（空字符串表示不写入日志文件） | 否 |
| `whitelist` | 用于直连的域名白名单（绕过 SOCKS5） | 否 |

### 白名单匹配规则

白名单支持精确域名匹配和通配符模式：

- 精确匹配: `"example.com"` 匹配 `example.com`
- 通配符: `"*.google.com"` 匹配 `mail.google.com`、`www.google.com` 等

## 使用说明

### 开发模式

```bash
pnpm run dev
```

### 生产构建

```bash
# 构建项目
pnpm run build

# 运行生产版本
pnpm run start
```

## 项目结构

```
prism-node/
├── src/
│   ├── config/              # 配置加载
│   │   ├── config.ts        # 配置加载器
│   │   └── types.ts         # 类型定义
│   ├── handlers/            # 请求处理器
│   │   ├── http-handler.ts    # HTTP 请求处理
│   │   └── connect-handler.ts # HTTPS CONNECT 隧道
│   ├── server/              # 服务器实现
│   │   └── proxy-server.ts    # HTTP/HTTPS 代理服务器
│   └── utils/               # 工具函数
│       ├── logger.ts        # Winston 日志
│       ├── utils.ts         # 辅助函数
│       └── whitelist.ts    # 域名白名单
├── config.example.json      # 配置模板
└── package.json             # 依赖和脚本
```

## 技术栈

- **Node.js**: 运行时环境
- **TypeScript**: 类型安全
- **Socks**: SOCKS5 客户端库
- **Winston**: 日志系统，支持日志轮转
- **Yargs**: 命令行参数解析
- **Biome**: 代码格式化和检查

## 架构设计

### 多进程模型

应用程序使用 Node.js Cluster 模块实现：
1. 主进程管理工作进程
2. 为每个 CPU 核心 fork 工作进程
3. 处理优雅关闭
4. 自动重启崩溃的工作进程（可配置）

### 代理流程

```
客户端 -> HTTP/HTTPS 请求 -> Prism Node -> SOCKS5 代理 -> 目标服务器
                                      |
                              [可选：白名单域名直连]
```

## 代码质量

```bash
# 格式化和修复代码
pnpm run fix

# 仅格式化
pnpm run format

# 仅检查 lint
pnpm run lint:check
```

## 许可证

MIT
