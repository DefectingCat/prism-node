```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```

# Prism Node - Development Guide

## Overview

Prism Node is a lightweight HTTP/HTTPS proxy server that forwards traffic to a SOCKS5 proxy with real-time statistics and visualization capabilities. It features a modern React frontend with Material-UI components and a Node.js backend using Hono and PostgreSQL.

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

# Start frontend development (separate terminal)
cd frontend && pnpm run dev
```

### Production
```bash
# Build the project
pnpm run build

# Run production version
pnpm run start

# Build standalone executable
pnpm run build:bin
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
├── src/                      # Backend TypeScript code
│   ├── config/              # Configuration loading
│   │   ├── config.ts        # Config loader
│   │   └── types.ts         # Type definitions
│   ├── handlers/            # HTTP request handlers
│   │   ├── connect-handler.ts  # HTTPS CONNECT tunnel
│   │   ├── http-handler.ts     # HTTP request handler
│   │   ├── stats-handler.ts    # Statistics API
│   │   ├── log-stream-handler.ts # WebSocket log streaming
│   │   ├── user-handler.ts     # User management (auth)
│   │   └── about-handler.ts    # About page
│   ├── server/              # Server implementations
│   │   ├── proxy-server.ts    # HTTP/HTTPS proxy server
│   │   ├── http-server.ts     # API server (Hono)
│   │   ├── stats-routes.ts    # Statistics endpoints
│   │   └── middlewares.ts     # Hono middlewares
│   └── utils/               # Utilities
│       ├── logger.ts        # Winston logger
│       ├── stats-collector.ts # Statistics collector
│       ├── database.ts      # PostgreSQL connection
│       ├── cron-manager.ts  # Node-cron scheduler
│       └── utils.ts         # Helper functions
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components (Home, Stats, Logs, etc.)
│   │   ├── i18n/           # Internationalization (zh/en)
│   │   └── utils/          # Frontend utilities
│   └── package.json
├── scripts/                 # Build and test scripts
│   ├── build.mjs           # Complete build process
│   └── test-websocket.mjs  # WebSocket testing
├── benches/                # Performance benchmarks
│   └── api-stress-test.mjs # API stress testing
└── config.example.json      # Configuration template
```

## Architecture

### Backend Stack
- **Hono**: High-performance HTTP server with middleware support
- **Node.js Cluster**: Multi-process load balancing
- **PostgreSQL**: Statistics data storage (optional)
- **Winston**: Logging system with daily rotation
- **WebSocket (ws)**: Real-time log streaming
- **SOCKS**: SOCKS5 proxy client
- **bcryptjs**: Password hashing
- **node-cron**: Scheduled tasks

### Frontend Stack
- **React 19**: Modern UI framework
- **Material-UI (MUI)**: Component library
- **MUI X-Charts**: Data visualization
- **MUI X-Date-Pickers Pro**: Date range picker
- **SWR**: Data fetching and caching
- **React Router**: Routing
- **i18next**: Internationalization
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tool

## Key Features

### Proxy Server
- HTTP and HTTPS proxy with SOCKS5 backend
- Connection pooling and load balancing via Node.js Cluster
- Real-time statistics collection
- WebSocket-based log streaming
- Winston logging with file rotation
- Domain blacklist support
- Database functionality (optional, default: false)

### Statistics Dashboard
- Total requests, traffic, and performance metrics
- Top hosts by visit count and traffic
- Response time trends
- Traffic distribution (upload/download)
- Flexible query parameters (time range, host, type)
- Auto-refresh functionality
- Active connections monitoring

### API Endpoints
- `GET /api/stats` - Statistics data (supports query parameters)
- `WS /api/logs/stream` - Real-time log streaming
- `GET /api/about` - Application information
- User management endpoints (CRUD operations)

## Configuration

```json
{
  "addr": "127.0.0.1:10808",      // Proxy server address
  "socks_addr": "127.0.0.1:13659", // SOCKS5 backend address
  "http_addr": "127.0.0.1:3000",  // API server address
  "postgres": {
    "host": "localhost",
    "port": 5432,
    "database": "prism-node",
    "user": "username",
    "password": "password"
  },
  "cron": "0 * * * *",            // Node-cron schedule (optional)
  "enableDatabase": false         // Enable/disable database (default: false)
}
```

## Development Workflow

### Adding a New Endpoint
1. Create handler in `src/handlers/`
2. Define route in `src/server/stats-routes.ts` or appropriate file
3. Add validation with Zod if accepting input
4. Add tests in `scripts/` (if needed)

### Database Changes
1. Modify `src/utils/database.ts` for new queries
2. Update TypeScript types in `src/config/types.ts`
3. Ensure stats collector (`src/utils/stats-collector.ts`) handles new data

### Frontend Changes
1. Create components in `frontend/src/components/`
2. Add pages in `frontend/src/pages/`
3. Update routing in `frontend/src/App.tsx`
4. Handle API calls in `frontend/src/utils/`

## Testing

```bash
# Stress test API
node benches/api-stress-test.mjs -u http://localhost:3000/api/stats -c 10 -r 1000

# Test WebSocket
node scripts/test-websocket.mjs
```

## Performance Tips

- Use `pnpm run build:bin` for production executable
- Configure log rotation in `config.json`
- Adjust PostgreSQL pool settings for high traffic
- Enable clustering (default behavior) for multi-core systems
- Database functionality is optional - set `enableDatabase: true` to use it

## Build Process

The build system (`scripts/build.mjs`) handles:
1. Compiling TypeScript code
2. Building frontend with Vite
3. Copying frontend assets to `dist/html`
4. Copying README files to distribution

## Code Style

- Formatter: Biome (configured in `biome.json`)
- Indentation: 2 spaces
- Quote style: Single quotes for JS/TS, double for JSX
- Trailing commas: Allowed
- Semicolons: Required

## Main Entry Point

`src/main.ts` uses Node.js Cluster module to:
1. Start master process that manages worker processes
2. Fork worker processes for each CPU core
3. Handle graceful shutdown
4. Manage cron tasks

## Key Classes and Utilities

### StatsCollector
- Collects real-time proxy statistics
- Manages active connections
- Handles database operations
- Located at `src/utils/stats-collector.ts`

### Database
- PostgreSQL connection and query management
- Stores access logs, domain blacklist, and users
- Located at `src/utils/database.ts`

### Logger
- Winston-based logging system
- Supports file rotation and console output
- Located at `src/utils/logger.ts`
