# Prism Node

A lightweight HTTP/HTTPS proxy server that forwards traffic to a SOCKS5 proxy.

## Features

- **Dual Protocol Support**: Handles both HTTP and HTTPS traffic
- **SOCKS5 Integration**: Forwards all proxy requests to a configured SOCKS5 server
- **Real-time Statistics**: Collects and displays proxy usage metrics
- **Real-time Log Streaming**: WebSocket-based live log streaming
- **Web Interface**: Built-in Hono HTTP server with a simple frontend
- **Configurable**: Easy-to-use JSON configuration
- **Graceful Shutdown**: Properly cleans up resources on exit
- **Logging**: Comprehensive logging with Winston

## Installation

```bash
pnpm install
```

## Configuration

1. Copy the example config file:

```bash
cp config.example.json config.json
```

2. Edit `config.json` to match your setup:

```json
{
  "addr": "127.0.0.1:10808", // Proxy server address
  "socks_addr": "127.0.0.1:13659", // SOCKS5 server address
  "http_addr": "127.0.0.1:3000" // Web interface address
}
```

## Usage

### Development Mode

```bash
pnpm run dev
```

### Production Build

```bash
pnpm run build
pnpm run start
```

### Build Executable

```bash
pnpm run build:bin
```

This will create a standalone executable named `prism-node`.

### Real-time Log Streaming

Connect to the WebSocket endpoint to receive real-time log streams:

```bash
# Using the provided test script
node test-websocket.mjs

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

- **Node.js**: Runtime
- **TypeScript**: Type safety
- **Hono**: HTTP server framework
- **Winston**: Logging
- **SQLite3**: Statistics storage
- **Socks**: SOCKS5 client library

## Project Structure

```
prism-node/
├── src/
│   ├── config/          # Configuration loading
│   ├── handlers/        # Request handlers
│   ├── server/          # Server implementations
│   └── utils/           # Utility functions
├── frontend/            # Web interface
├── config.example.json  # Example configuration
└── package.json         # Dependencies and scripts
```

## Benches

```bash
node benches/api-stress-test.mjs -u http://localhost:3000/api/stats -c 10 -r 1000
```

## License

MIT
