#!/usr/bin/env node

import { exec } from 'node:child_process';
import util from 'node:util';

const execAsync = util.promisify(exec);

async function main() {
  console.log('Building server...');
  const { stdout } = await execAsync('pnpm run build');
  console.log(stdout);
  console.log('Building frontend...');
  const { stdout: stdout2 } = await execAsync('cd frontend && pnpm run build');
  console.log(stdout2);
}

main().catch(console.error);
