#!/usr/bin/env node

/**
 * Test script for WebSocket log streaming
 * Connects to /api/logs/stream and displays real-time logs
 */

import WebSocket from 'ws';

const WS_URL = 'ws://127.0.0.1:3000/api/logs/stream';

console.log(`Connecting to ${WS_URL}...`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to log stream');
  console.log('📡 Listening for logs...\n');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());

    // Pretty print the log message
    if (message.type === 'connected') {
      console.log(`🔔 ${message.message} at ${message.timestamp}`);
    } else {
      // Format log entry
      const timestamp = message.timestamp || new Date().toISOString();
      const level = (message.level || 'info').toUpperCase();
      const msg = message.message || '';

      // Color-code based on log level
      const levelEmoji =
        {
          ERROR: '❌',
          WARN: '⚠️',
          INFO: 'ℹ️',
          DEBUG: '🔍',
          VERBOSE: '📝',
        }[level] || '📋';

      console.log(`${levelEmoji} [${level}] ${timestamp}`);
      console.log(`   ${msg}`);

      // Show additional metadata if present
      const metadata = { ...message };
      delete metadata.timestamp;
      delete metadata.level;
      delete metadata.message;
      delete metadata.service;

      if (Object.keys(metadata).length > 0) {
        console.log(`   Metadata:`, JSON.stringify(metadata, null, 2));
      }
      console.log('');
    }
  } catch (error) {
    // If not JSON, just print raw message
    console.log(`📨 ${data.toString()}`);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
  process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Closing connection...');
  ws.close();
});

process.on('SIGTERM', () => {
  console.log('\n👋 Closing connection...');
  ws.close();
});
