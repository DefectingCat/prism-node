# Prism Node

A lightweight HTTP/HTTPS proxy server that forwards traffic to a SOCKS5 proxy.

## Overview

Prism Node is a simple yet powerful proxy server solution built with Node.js and TypeScript. It supports both HTTP and HTTPS traffic forwarding through a SOCKS5 proxy with multi-process load balancing.

## Features

### Core Proxy Functions
- **Dual Protocol Support**: Handles both HTTP and HTTPS traffic
- **SOCKS5 Integration**: Forwards all proxy requests to a configured SOCKS5 server
- **Multi-Process Load Balancing**: Automatically creates worker processes based on CPU cores for better performance
- **Graceful Shutdown**: Properly cleans up resources on exit (SIGTERM/SIGINT)
- **Domain Whitelist**: Support direct connections for specific domains (bypass SOCKS5)
- **Request Tracking**: Each request has a unique ID for logging and debugging
- **Transfer Statistics**: Records upload/download bytes for each connection
- **Comprehensive Logging**: Winston-based logging system with file rotation support

## Installation

### Prerequisites
- Node.js >= 18
- pnpm >= 8

### Install Dependencies

```bash
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
  "addr": "127.0.0.1:10808",
  "socks_addr": "127.0.0.1:13659",
  "log_path": "./logs",
  "whitelist": ["example.com", "*.google.com"]
}
```

### Configuration Options

| Field | Description | Required |
|-------|-------------|----------|
| `addr` | Proxy server listening address | Yes |
| `socks_addr` | SOCKS5 server address | Yes |
| `log_path` | Log file path (empty string to disable file logging) | No |
| `whitelist` | Domain whitelist for direct connections (bypass SOCKS5) | No |

### Whitelist Patterns

The whitelist supports exact domain matching and wildcard patterns:

- Exact match: `"example.com"` matches `example.com`
- Wildcard: `"*.google.com"` matches `mail.google.com`, `www.google.com`, etc.

## Usage

### Development Mode

```bash
pnpm run dev
```

### Production Build

```bash
# Build the project
pnpm run build

# Run production version
pnpm run start
```

## Project Structure

```
prism-node/
├── src/
│   ├── config/              # Configuration loading
│   │   ├── config.ts        # Config loader
│   │   └── types.ts         # Type definitions
│   ├── handlers/            # Request handlers
│   │   ├── http-handler.ts    # HTTP request handler
│   │   └── connect-handler.ts # HTTPS CONNECT tunnel
│   ├── server/              # Server implementations
│   │   └── proxy-server.ts    # HTTP/HTTPS proxy server
│   └── utils/               # Utilities
│       ├── logger.ts        # Winston logger
│       ├── utils.ts         # Helper functions
│       └── whitelist.ts    # Domain whitelist
├── config.example.json      # Configuration template
└── package.json             # Dependencies and scripts
```

## Tech Stack

- **Node.js**: Runtime environment
- **TypeScript**: Type safety
- **Socks**: SOCKS5 client library
- **Winston**: Logging system with daily rotation
- **Yargs**: Command-line argument parsing
- **Biome**: Code formatting and linting

## Architecture

### Multi-Process Model

The application uses Node.js Cluster module to:
1. Master process manages worker processes
2. Fork worker processes for each CPU core
3. Handle graceful shutdown
4. Auto-restart crashed workers (configurable)

### Proxy Flow

```
Client -> HTTP/HTTPS Request -> Prism Node -> SOCKS5 Proxy -> Target Server
                                    |
                              [Optional: Direct connection for whitelist domains]
```

## Code Quality

```bash
# Format and fix code
pnpm run fix

# Format only
pnpm run format

# Lint check
pnpm run lint:check
```

## License

MIT
