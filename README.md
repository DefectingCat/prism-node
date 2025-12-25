# Prism Node

A lightweight HTTP/HTTPS proxy server that forwards traffic to a SOCKS5 proxy with powerful visualization and statistics capabilities.

## Overview

Prism Node is a complete proxy server solution that integrates real-time statistics, log streaming, and a modern web interface. Through intuitive visualization charts and flexible query parameters, it helps you fully understand the operational status and traffic of your proxy service.

## Key Features

### Core Proxy Functions
- **Dual Protocol Support**: Handles both HTTP and HTTPS traffic
- **SOCKS5 Integration**: Forwards all proxy requests to a configured SOCKS5 server
- **Graceful Shutdown**: Properly cleans up resources on exit
- **Comprehensive Logging**: Based on Winston logging system

### Real-time Statistics Dashboard

#### 📊 Data Statistics Display
- **Total Requests**: Real-time display of total requests processed by the proxy service
- **Traffic Statistics**: 
  - Total upload traffic (automatic unit conversion: B/KB/MB/GB/TB/PB)
  - Total download traffic (intelligent formatting display)
- **Performance Metrics**: Average response time (millisecond level)
- **Active Connections**: Real-time monitoring of current active connections
- **Top Hosts**: Statistics of top 10 hosts by visit count and traffic usage
- **Recent Records**: Latest proxy request details (including type, target, duration, status)

#### 📈 Visualization Charts
- **Bar Charts**:
  - Top hosts visit count comparison
  - Response time trend analysis
- **Pie Charts**: Upload/download traffic ratio visualization
- Based on MUI X-Charts with interactive data exploration support

#### 🔍 Flexible Query Parameters
- **Time Range Filter**: Date range picker (DateRangePicker) for precise statistics filtering
- **Pagination Control**: 
  - Page number setting
  - Page size editable dropdown (supports preset values: 10/20/50/100 or custom input)
- **Request Type Filter**: Filter HTTP/HTTPS or all requests
- **Host Filter**: Precise query by target host name
- Parameters take effect immediately and automatically trigger data refresh

#### ⚡ Auto Refresh Function
- **Toggle Control**: One-click enable/disable auto refresh
- **Custom Refresh Interval**: 
  - Supports millisecond-level settings (minimum 100ms)
  - Real-time input validation and application
  - Takes effect immediately when pressing Enter or losing focus
- Based on SWR's intelligent data fetching to reduce unnecessary requests

### Real-time Log Streaming
- **WebSocket Real-time Push**: Receive real-time logs via `/api/logs/stream`
- **JSON Format**: Contains timestamp, log level, message content and other metadata
- **Multi-level Logs**: Supports info, error, warn, debug levels

## Installation

### Prerequisites
- Node.js >= 18
- pnpm >= 8

### Install Dependencies

```bash
# Install all dependencies (backend + frontend)
pnpm install
```

## Configuration

1. Copy the example configuration file:

```bash
cp config.example.json config.json
```

2. Edit `config.json` to match your setup:

```json
{
  "addr": "127.0.0.1:10808",      // Proxy server listening address
  "socks_addr": "127.0.0.1:13659", // SOCKS5 server address
  "http_addr": "127.0.0.1:3000"   // Web interface access address
}
```

## Usage

### Development Mode

```bash
# Start backend and frontend development servers
pnpm run dev
```

Then visit `http://127.0.0.1:3000` to view the web interface.

### Production Build

```bash
# Build the project
pnpm run build

# Run production version
pnpm run start
```

### Build Executable

```bash
pnpm run build:bin
```

This will create a standalone executable named `prism-node`.

## API Endpoints

### Statistics API
- `GET /api/stats` - Get proxy statistics data
  - Supports query parameters: `startTime`, `endTime`, `page`, `pageSize`, `type`, `host`
  - Returns: total requests, traffic statistics, top hosts, recent records, etc.

### Real-time Log Streaming
- `WS /api/logs/stream` - WebSocket log streaming endpoint

Connect to the WebSocket endpoint to receive real-time log streams:

```bash
# Using the provided test script
node scripts/test-websocket.mjs

# Or connect directly with any WebSocket client
ws://127.0.0.1:3000/api/logs/stream
```

The log stream endpoint broadcasts all application logs in JSON format, including:
- Log level (info, error, warn, debug)
- Timestamp
- Message content
- Additional metadata

**Example log message:**
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

## Tech Stack

### Backend
- **Node.js**: Runtime environment
- **TypeScript**: Type safety
- **Hono**: High-performance HTTP server framework
- **Winston**: Logging
- **SQLite3**: Statistics data persistent storage
- **Socks**: SOCKS5 client library
- **WebSocket (ws)**: Real-time log streaming

### Frontend
- **React 19**: Modern UI framework
- **Material-UI (MUI)**: Component library
  - MUI X-Charts: Chart visualization (bar charts, pie charts)
  - MUI X-Date-Pickers Pro: Date range picker
- **SWR**: Data fetching and caching (supports auto refresh)
- **React Router**: Routing management
- **React-i18next**: Internationalization support (Chinese/English switching)
- **Axios**: HTTP client
- **Day.js**: Date handling
- **Vite**: Fast development and build tool

## Project Structure

```
prism-node/
├── src/                 # Backend source code
│   ├── config/          # Configuration loading
│   ├── handlers/        # Request handlers
│   ├── server/          # Server implementations
│   └── utils/           # Utility functions
├── frontend/            # Frontend source code
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components (Home, Stats, Logs, etc.)
│   │   ├── i18n/        # Internationalization config
│   │   └── utils/       # Utility functions
│   └── package.json     # Frontend dependencies
├── scripts/             # Build and test scripts
├── config.example.json  # Configuration example
└── package.json         # Backend dependencies and scripts
```

## Performance Testing

Use the built-in stress testing script to test API performance:

```bash
node benches/api-stress-test.mjs -u http://localhost:3000/api/stats -c 10 -r 1000
```

Parameter description:
- `-u`: API address
- `-c`: Concurrency
- `-r`: Total requests

## Screenshots

> Note: The web interface supports Chinese/English switching and dark/light theme switching

### Real-time Statistics Dashboard
The statistics dashboard displays key metrics of the proxy service, including total requests, traffic statistics, average response time, etc. Bar charts and pie charts intuitively show top host visits and traffic distribution.

### Flexible Query Parameters
Supports multi-dimensional filtering of statistics data by time range, request type, host name, etc., and allows custom refresh intervals for real-time monitoring.

## Development

### Code Formatting and Checking

```bash
# Format and fix code
pnpm run fix

# Format only
pnpm run format

# Lint check only
pnpm run lint
```

### Frontend Development

```bash
cd frontend
pnpm run dev  # Start frontend development server
pnpm run build  # Build frontend production version
```

## Contributing

Issues and Pull Requests are welcome!

## License

MIT
