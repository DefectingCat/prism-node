# Prism Node

一个轻量级的 HTTP/HTTPS 代理服务器，支持将流量转发到 SOCKS5 代理，并提供强大的可视化统计功能。

## 项目概述

Prism Node 是一个功能完整的代理服务器解决方案，集成了实时统计、日志流和现代化 Web 界面。通过直观的可视化图表和灵活的查询参数，帮助您全面掌握代理服务的运行状态和流量情况。

## 主要功能特性

### 核心代理功能
- **双协议支持**: 处理 HTTP 和 HTTPS 流量
- **SOCKS5 集成**: 将所有代理请求转发到配置的 SOCKS5 服务器
- **优雅关闭**: 正确清理资源并退出
- **完善日志**: 基于 Winston 的综合日志系统

### 实时统计仪表板

#### 📊 数据统计展示
- **请求总数**: 实时显示代理服务处理的总请求数
- **流量统计**: 
  - 上传流量总计（自动单位转换：B/KB/MB/GB/TB/PB）
  - 下载流量总计（智能格式化显示）
- **性能指标**: 平均响应时间（毫秒级）
- **活跃连接**: 当前活跃连接数实时监控
- **热门主机**: 访问次数和流量占用前 10 的主机统计
- **最近记录**: 最新的代理请求详情（包括类型、目标、耗时、状态）

#### 📈 可视化图表
- **柱状图（Bar Chart）**:
  - 热门主机访问量对比
  - 响应时间趋势分析
- **饼图（Pie Chart）**: 上传/下载流量占比可视化
- 基于 MUI X-Charts，支持交互式数据探索

#### 🔍 灵活查询参数
- **时间范围过滤**: 支持日期范围选择器（DateRangePicker），精确筛选统计时段
- **分页控制**: 
  - 页码（Page）设置
  - 每页大小（Page Size）可编辑下拉框（支持预设值：10/20/50/100 或自定义输入）
- **请求类型过滤**: 支持筛选 HTTP/HTTPS 或全部请求
- **主机过滤**: 根据目标主机名精确查询
- 参数变化即时生效，自动触发数据刷新

#### ⚡ 自动刷新功能
- **开关控制**: 一键启用/禁用自动刷新
- **自定义刷新间隔**: 
  - 支持毫秒级设置（最小 100ms）
  - 实时输入验证和应用
  - 按下 Enter 或失去焦点时立即生效
- 基于 SWR 的智能数据获取，减少不必要的请求

### 实时日志流
- **WebSocket 实时推送**: 通过 `/api/logs/stream` 接收实时日志
- **JSON 格式**: 包含时间戳、日志级别、消息内容等元数据
- **多级别日志**: 支持 info、error、warn、debug 等级别

## 安装

### 前置要求
- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
# 安装所有依赖（后端 + 前端）
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
  "addr": "127.0.0.1:10808",      // 代理服务器监听地址
  "socks_addr": "127.0.0.1:13659", // SOCKS5 服务器地址
  "http_addr": "127.0.0.1:3000"   // Web 界面访问地址
}
```

## 使用说明

### 开发模式

```bash
# 启动后端和前端开发服务器
pnpm run dev
```

然后访问 `http://127.0.0.1:3000` 查看 Web 界面。

### 生产构建

```bash
# 构建项目
pnpm run build

# 运行生产版本
pnpm run start
```

### 构建可执行文件

```bash
pnpm run build:bin
```

这将创建一个名为 `prism-node` 的独立可执行文件。

## API 端点

### 统计接口
- `GET /api/stats` - 获取代理统计数据
  - 支持查询参数：`startTime`、`endTime`、`page`、`pageSize`、`type`、`host`
  - 返回：请求总数、流量统计、热门主机、最近记录等

### 实时日志流
- `WS /api/logs/stream` - WebSocket 日志流端点

连接到 WebSocket 端点以接收实时日志流：

```bash
# 使用提供的测试脚本
node scripts/test-websocket.mjs

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

### 后端
- **Node.js**: 运行时环境
- **TypeScript**: 类型安全
- **Hono**: 高性能 HTTP 服务器框架
- **Winston**: 日志记录
- **SQLite3**: 统计数据持久化存储
- **Socks**: SOCKS5 客户端库
- **WebSocket (ws)**: 实时日志流

### 前端
- **React 19**: 现代化 UI 框架
- **Material-UI (MUI)**: 组件库
  - MUI X-Charts: 图表可视化（柱状图、饼图）
  - MUI X-Date-Pickers Pro: 日期范围选择器
- **SWR**: 数据获取和缓存（支持自动刷新）
- **React Router**: 路由管理
- **React-i18next**: 国际化支持（中英文切换）
- **Axios**: HTTP 客户端
- **Day.js**: 日期处理
- **Vite**: 快速开发和构建工具

## 项目结构

```
prism-node/
├── src/                 # 后端源码
│   ├── config/          # 配置加载
│   ├── handlers/        # 请求处理器
│   ├── server/          # 服务器实现
│   └── utils/           # 工具函数
├── frontend/            # 前端源码
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── pages/       # 页面组件（Home、Stats、Logs 等）
│   │   ├── i18n/        # 国际化配置
│   │   └── utils/       # 工具函数
│   └── package.json     # 前端依赖
├── scripts/             # 构建和测试脚本
├── config.example.json  # 配置示例
└── package.json         # 后端依赖和脚本
```

## 性能测试

使用内置的压力测试脚本测试 API 性能：

```bash
node benches/api-stress-test.mjs -u http://localhost:3000/api/stats -c 10 -r 1000
```

参数说明：
- `-u`: API 地址
- `-c`: 并发数
- `-r`: 请求总数

## 功能截图

> 注：Web 界面支持中英文切换、深色/浅色主题切换

### 实时统计仪表板
统计仪表板展示了代理服务的关键指标，包括请求总数、流量统计、平均响应时间等。通过柱状图和饼图直观展示热门主机访问情况和流量分布。

### 灵活的查询参数
支持通过时间范围、请求类型、主机名等多维度筛选统计数据，并可自定义刷新间隔实现实时监控。

## 开发说明

### 代码格式化和检查

```bash
# 格式化和修复代码
pnpm run fix

# 仅格式化
pnpm run format

# 仅检查 lint
pnpm run lint
```

### 前端开发

```bash
cd frontend
pnpm run dev  # 启动前端开发服务器
pnpm run build  # 构建前端生产版本
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
