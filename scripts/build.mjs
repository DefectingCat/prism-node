#!/usr/bin/env node

/**
 * @fileoverview 项目构建脚本
 *
 * 本脚本负责完整的项目构建流程，包括：
 * 1. 构建服务端代码（TypeScript 编译）
 * 2. 构建前端代码（Vite 构建）
 * 3. 将前端构建产物复制到服务端输出目录
 *
 * 构建完成后，所有文件将位于 dist 目录中，可以直接部署运行。
 */

import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 执行命令行命令并返回 Promise
 *
 * @param {string} command - 要执行的命令（如 'pnpm'、'npm' 等）
 * @param {string[]} args - 命令参数数组（如 ['run', 'build']）
 * @param {Object} options - spawn 的选项配置（如 { cwd: 'frontend' }）
 * @returns {Promise<string>} 返回 Promise，成功时 resolve 标准输出内容，失败时 reject 错误信息
 *
 * @description
 * 该函数封装了 child_process.spawn，提供了更友好的 Promise 接口。
 * 它会实时输出命令的 stdout 和 stderr，并在命令执行完成后根据退出码决定 resolve 或 reject。
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    // 使用 spawn 创建子进程执行命令
    const childProcess = spawn(command, args, options);

    // 收集标准输出数据
    let stdoutData = '';

    childProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      process.stdout.write(data); // 实时打印到控制台，便于查看构建进度
    });

    // 收集标准错误数据
    let stderrData = '';

    childProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      process.stderr.write(data); // 实时打印错误信息，便于调试
    });

    // 监听子进程结束事件
    childProcess.on('close', (code) => {
      if (code === 0) {
        // 退出码为 0 表示成功，resolve 返回标准输出内容
        resolve(stdoutData);
      } else {
        // 退出码非 0 表示失败，reject 返回包含命令、退出码和错误信息的 Error
        reject(
          new Error(
            `Command "${command} ${args.join(' ')}" failed with exit code ${code}\nStderr: ${stderrData}`,
          ),
        );
      }
    });

    // 监听子进程错误事件（如命令不存在等）
    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 递归复制整个目录
 *
 * @param {string} sourceDir - 源目录路径
 * @param {string} targetDir - 目标目录路径
 *
 * @description
 * 该函数会递归地将源目录下的所有文件和子目录复制到目标目录。
 * 如果目标目录不存在，会自动创建。支持深层嵌套的目录结构。
 */
function copyDirectory(sourceDir, targetDir) {
  // 创建目标目录（如果不存在），recursive: true 表示递归创建父目录
  mkdirSync(targetDir, { recursive: true });

  // 读取源目录中的所有文件和子目录
  const files = readdirSync(sourceDir);

  // 遍历源目录中的每个文件/目录
  for (const file of files) {
    const sourcePath = join(sourceDir, file); // 拼接源文件完整路径
    const targetPath = join(targetDir, file); // 拼接目标文件完整路径
    const stats = statSync(sourcePath); // 获取文件/目录的状态信息

    if (stats.isDirectory()) {
      // 如果是目录，递归调用 copyDirectory 复制整个子目录
      copyDirectory(sourcePath, targetPath);
    } else {
      // 如果是文件，直接复制文件内容
      copyFileSync(sourcePath, targetPath);
    }
  }
}

/**
 * 主构建流程函数
 *
 * @async
 * @description
 * 按顺序执行完整的项目构建流程：
 * 1. 构建服务端代码（执行根目录的 pnpm run build）
 * 2. 构建前端代码（执行 frontend 目录的 pnpm run build）
 * 3. 将前端构建产物从 frontend/dist 复制到 dist/html
 *
 * 如果任何步骤失败，会捕获错误并以非零退出码退出进程。
 */
async function main() {
  try {
    // 步骤 1: 构建服务端代码
    console.log('Building server...');
    await runCommand('pnpm', ['run', 'build']);

    // 步骤 2: 构建前端代码（在 frontend 目录下执行）
    console.log('Building frontend...');
    await runCommand('pnpm', ['run', 'build'], { cwd: 'frontend' });

    // 步骤 3: 复制前端构建产物到服务端输出目录
    console.log('Copying frontend files to dist/html/...');
    copyDirectory('frontend/dist', 'dist/html');

    // 步骤 4: 复制 README 文件到 dist 目录（支持多语言版本）
    console.log('Copying README files to dist/...');

    // 确保 dist 目录存在
    if (!existsSync('dist')) {
      mkdirSync('dist', { recursive: true });
    }

    // 复制英文版 README.md
    const readmePath = 'README.md';
    const targetReadmePath = join('dist', 'README.md');
    if (existsSync(readmePath)) {
      copyFileSync(readmePath, targetReadmePath);
      console.log('README.md copied successfully!');
    } else {
      console.warn('README.md not found in project root, skipping...');
    }

    // 复制中文版 README-zh.md
    const readmeZhPath = 'README-zh.md';
    const targetReadmeZhPath = join('dist', 'README-zh.md');
    if (existsSync(readmeZhPath)) {
      copyFileSync(readmeZhPath, targetReadmeZhPath);
      console.log('README-zh.md copied successfully!');
    } else {
      console.warn('README-zh.md not found in project root, skipping...');
    }

    // 构建完成提示
    console.log('Build completed successfully!');
  } catch (error) {
    // 错误处理：打印错误信息并以退出码 1 退出（表示构建失败）
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

// 执行主构建流程
main();
