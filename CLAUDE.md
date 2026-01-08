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
pnpm run lint

# Lint and fix
pnpm run lint:check
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
│       └── utils.ts         # Helper functions
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── i18n/           # Internationalization (zh/en)
│   │   └── utils/          # Frontend utilities
│   └── package.json
├── scripts/                 # Build and test scripts
└── config.example.json      # Configuration template
```

## Architecture

### Backend Stack
- **Hono**: High-performance HTTP server with middleware support
- **Node.js Cluster**: Multi-process load balancing
- **PostgreSQL**: Statistics data storage
- **Winston**: Logging system with daily rotation
- **WebSocket (ws)**: Real-time log streaming
- **SOCKS**: SOCKS5 proxy client
- **bcryptjs**: Password hashing

### Frontend Stack
- **React 19**: Modern UI framework
- **Material-UI (MUI)**: Component library
- **MUI X-Charts**: Data visualization
- **SWR**: Data fetching and caching
- **React Router**: Routing
- **i18next**: Internationalization

## Key Features

### Proxy Server
- HTTP and HTTPS proxy with SOCKS5 backend
- Connection pooling and load balancing via Node.js Cluster
- Real-time statistics collection
- WebSocket-based log streaming
- Winston logging with file rotation

### Statistics Dashboard
- Total requests, traffic, and performance metrics
- Top hosts by visit count and traffic
- Response time trends
- Traffic distribution (upload/download)
- Flexible query parameters (time range, host, type)
- Auto-refresh functionality

### API Endpoints
- `GET /api/stats` - Statistics data
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
  }
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
