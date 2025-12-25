# Prism Node

一个轻量级的 HTTP/HTTPS 代理服务器，可将流量转发到 SOCKS5 代理。

## 功能特性

- **双协议支持**：支持 HTTP 和 HTTPS 流量
- **SOCKS5 集成**：将所有代理请求转发到配置的 SOCKS5 服务器
- **实时统计**：收集并显示代理使用指标
- **实时日志流**：基于 WebSocket 的实时日志流传输
- **Web 界面**：内置 Hono HTTP 服务器和简洁的前端界面
- **可配置**：简单易用的 JSON 配置
- **优雅关闭**：退出时正确清理资源
- **日志记录**：使用 Winston 进行全面的日志记录

## 安装

```bash
pnpm install
```

## 配置

1. 复制示例配置文件：

```bash
cp config.example.json config.json
```

2. 编辑 `config.json` 以匹配你的设置：

```json
{
  "addr": "127.0.0.1:10808", // 代理服务器地址
  "socks_addr": "127.0.0.1:13659", // SOCKS5 服务器地址
  "http_addr": "127.0.0.1:3000" // Web 界面地址
}
```

## 使用方法

### 开发模式

```bash
pnpm run dev
```

### 生产环境构建

```bash
pnpm run build
pnpm run start
```

### 构建可执行文件

```bash
pnpm run build:bin
```

这将创建一个名为 `prism-node` 的独立可执行文件。

### 实时日志流

连接到 WebSocket 端点以接收实时日志流：

```bash
# 使用提供的测试脚本
node test-websocket.mjs

# 或使用任何 WebSocket 客户端直接连接
ws://127.0.0.1:3000/api/logs/stream
```

日志流端点以 JSON 格式广播所有应用程序日志，包括：
- 日志级别（info、error、warn、debug）
- 时间戳
- 消息内容
- 附加元数据

**日志消息示例：**
```json
{
  "timestamp": "2025-12-25T11:00:00.000Z",
  "level": "info",
  "message": "HTTP Request",
  "service": "prism-node",
  "method": "GET",
  "url": "http://127.0.0.1:3000/api/stats"
}
```

## 技术栈

- **Node.js**：运行时环境
- **TypeScript**：类型安全
- **Hono**：HTTP 服务器框架
- **Winston**：日志记录
- **SQLite3**：统计数据存储
- **Socks**：SOCKS5 客户端库

## 项目结构

```
prism-node/
├── src/
│   ├── config/          # 配置加载
│   ├── handlers/        # 请求处理器
│   ├── server/          # 服务器实现
│   └── utils/           # 工具函数
├── frontend/            # Web 界面
├── config.example.json  # 示例配置
└── package.json         # 依赖和脚本
```

## 性能测试

```bash
node benches/api-stress-test.mjs -u http://localhost:3000/api/stats -c 10 -r 1000
```

## 许可证

MIT
