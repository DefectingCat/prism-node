#!/usr/bin/env node

import { spawn } from 'node:child_process';

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, options);

    // Collect stdout data
    let stdoutData = '';

    childProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      process.stdout.write(data); // Print immediately
    });

    // Collect stderr data
    let stderrData = '';

    childProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      process.stderr.write(data); // Print immediately
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(stdoutData); // Resolve with stdout data
      } else {
        reject(new Error(`Command "${command} ${args.join(' ')}" failed with exit code ${code}\nStderr: ${stderrData}`));
      }
    });

    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    console.log('Building server...');
    await runCommand('pnpm', ['run', 'build']);
    console.log('Building frontend...');
    await runCommand('pnpm', ['run', 'build'], { cwd: 'frontend' });
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

main();
