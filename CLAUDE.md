# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Prism Node - Development Guide

## Overview

Prism Node is a lightweight HTTP/HTTPS proxy server that forwards traffic to a SOCKS5 proxy. It uses Node.js Cluster for multi-process load balancing and Winston for logging.

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Copy configuration file
cp config.example.json config.json

# Edit config.json with your settings
```

### Development

```bash
# Start development server
pnpm run dev
```

### Production

```bash
# Build the project
pnpm run build

# Run production version
pnpm run start
```

## Code Quality

```bash
# Format and fix code
pnpm run fix

# Format only
pnpm run format

# Lint check
pnpm run lint:check

# Lint and fix
pnpm run lint
```

## Project Structure

```
prism-node/
├── src/                      # TypeScript source code
│   ├── config/              # Configuration loading
│   │   ├── config.ts        # Config loader (JSON5)
│   │   └── types.ts         # Type definitions
│   ├── handlers/            # HTTP request handlers
│   │   ├── connect-handler.ts  # HTTPS CONNECT tunnel
│   │   └── http-handler.ts     # HTTP request handler
│   ├── server/              # Server implementations
│   │   └── proxy-server.ts    # HTTP/HTTPS proxy server
│   └── utils/               # Utilities
│       ├── logger.ts        # Winston logger
│       ├── utils.ts         # Helper functions
│       └── whitelist.ts     # Domain whitelist for direct connections
├── config.example.json      # Configuration template
├── benches/                 # Performance benchmarks
└── scripts/                 # Build scripts
```

## Architecture

### Backend Stack

- **Node.js**: Runtime environment
- **Node.js Cluster**: Multi-process load balancing
- **Winston**: Logging system with file rotation
- **SOCKS**: SOCKS5 proxy client
- **JSON5**: Configuration file parsing (supports comments)
- **yargs**: CLI argument parsing

### Key Features

- HTTP and HTTPS proxy with SOCKS5 backend
- Connection pooling and load balancing via Node.js Cluster
- Domain whitelist for direct connections (bypassing SOCKS5)
- Winston logging with file rotation
- Graceful shutdown handling
- Auto-restart for crashed worker processes

## Configuration

```json
{
  "addr": "127.0.0.1:10808",
  "socks_addr": "127.0.0.1:13659",
  "log_path": "./logs",
  "whitelist": ["example.com", "*.google.com"]
}
```

### Configuration Options

| Field | Required | Description |
|-------|----------|-------------|
| `addr` | Yes | Proxy server listening address |
| `socks_addr` | Yes | SOCKS5 backend address |
| `log_path` | No | Log file path (empty = console only) |
| `whitelist` | No | Domain list for direct connections |

### Whitelist Patterns

The whitelist supports:
- Exact domain: `example.com`
- Wildcard subdomain: `*.google.com` (matches `www.google.com`, `mail.google.com`, etc.)

## Development Workflow

### Adding a New Handler

1. Create handler in `src/handlers/`
2. Import and use in `src/server/proxy-server.ts`

### Adding Configuration Options

1. Update `src/config/types.ts` with new interface field
2. Add validation in `src/config/config.ts`

## Testing

```bash
# Run in development with hot reload
pnpm run dev
```

## Code Style

- Formatter: Biome (configured in `biome.json`)
- Indentation: 2 spaces
- Quote style: Single quotes for JS/TS
- Trailing commas: Allowed
- Semicolons: Required

## Main Entry Point

`src/main.ts` uses Node.js Cluster module to:

1. Start master process that manages worker processes
2. Fork worker processes for each CPU core
3. Handle graceful shutdown
4. Auto-restart crashed workers

## Key Classes and Utilities

### ProxyServer

- Handles HTTP and HTTPS requests
- Manages SOCKS5 tunnel creation
- Supports direct connections for whitelisted domains
- Located at `src/server/proxy-server.ts`

### ConnectHandler

- Handles HTTPS CONNECT requests
- Creates SOCKS5 tunnels or direct connections
- Manages bidirectional data forwarding
- Located at `src/handlers/connect-handler.ts`

### HttpHandler

- Handles standard HTTP requests
- Forwards requests through SOCKS5 proxy
- Located at `src/handlers/http-handler.ts`

### Whitelist

- Domain matching with wildcard support
- Determines whether to use direct connection or SOCKS5
- Located at `src/utils/whitelist.ts`

### Logger

- Winston-based logging system
- Supports file rotation and console output
- Located at `src/utils/logger.ts`