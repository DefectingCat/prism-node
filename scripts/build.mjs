#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
        reject(
          new Error(
            `Command "${command} ${args.join(' ')}" failed with exit code ${code}\nStderr: ${stderrData}`,
          ),
        );
      }
    });

    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

function copyDirectory(sourceDir, targetDir) {
  // Create target directory if it doesn't exist
  mkdirSync(targetDir, { recursive: true });

  // Read all files in source directory
  const files = readdirSync(sourceDir);

  for (const file of files) {
    const sourcePath = join(sourceDir, file);
    const targetPath = join(targetDir, file);
    const stats = statSync(sourcePath);

    if (stats.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(sourcePath, targetPath);
    } else {
      // Copy individual files
      copyFileSync(sourcePath, targetPath);
    }
  }
}

async function main() {
  try {
    console.log('Building server...');
    await runCommand('pnpm', ['run', 'build']);
    console.log('Building frontend...');
    await runCommand('pnpm', ['run', 'build'], { cwd: 'frontend' });
    console.log('Copying frontend files to dist/html/...');
    copyDirectory('frontend/dist', 'dist/html');
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

main();
