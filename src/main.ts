import cluster from 'node:cluster';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadConfig } from './config/config';
import { startHttpServer } from './server/http-server';
import { startProxy } from './server/proxy-server';
import logger from './utils/logger';

/**
 * 工作进程入口 - 启动代理服务器和 HTTP 服务器
 */
async function startWorker(): Promise<void> {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    logger.info(
      `Worker ${process.pid} loading configuration from ${configPath}...`,
    );
    const config = await loadConfig(configPath);
    logger.info(`Worker ${process.pid} configuration loaded successfully`);

    const [proxyAddr, httpAddr] = await Promise.all([
      startProxy(config),
      startHttpServer(config),
    ]);
    logger.info(`Worker ${process.pid} started successfully`);
    logger.info(`Proxy server listening on: ${proxyAddr}`);
    logger.info(`HTTP server listening on: ${httpAddr}`);
  } catch (error) {
    logger.error(
      `Worker ${process.pid} failed to start servers:`,
      error instanceof Error ? error.message : String(error),
    );
    // 输出错误到 stderr 确保父进程能捕获
    console.error(
      `Worker ${process.pid} failed:`,
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

/**
 * 主进程入口 - 根据 CPU 核心数创建工作进程
 */
function startMaster(): void {
  const numCPUs = os.cpus().length;
  logger.info(`Master process ${process.pid} starting...`);
  logger.info(`CPU cores detected: ${numCPUs}`);
  logger.info(`Creating ${numCPUs} worker processes for load balancing`);

  // 为每个 CPU 核心创建一个工作进程
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    logger.info(`Forked worker ${worker.process.pid} (${i + 1}/${numCPUs})`);
  }

  // 监听工作进程上线事件
  cluster.on('online', (worker) => {
    logger.info(`Worker ${worker.process.pid} is online and ready`);
  });

  // 监听工作进程退出事件，自动重启崩溃的工作进程
  cluster.on('exit', (worker, code, signal) => {
    if (signal) {
      logger.warn(
        `Worker ${worker.process.pid} was killed by signal: ${signal}`,
      );
    } else if (code !== 0) {
      logger.error(
        `Worker ${worker.process.pid} exited with error code: ${code}`,
      );
    } else {
      logger.info(`Worker ${worker.process.pid} exited normally`);
    }

    // 如果工作进程异常退出，自动重启一个新的工作进程
    if (code !== 0 || signal) {
      logger.info('Starting a new worker to replace the crashed one...');
      // const newWorker = cluster.fork();
      // logger.info(`New worker ${newWorker.process.pid} forked as replacement`);
    }
  });

  // 优雅关闭：接收到退出信号时，关闭所有工作进程
  const gracefulShutdown = (signal: string) => {
    logger.info(
      `Master ${process.pid} received ${signal}, shutting down workers...`,
    );

    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker) {
        logger.info(`Shutting down worker ${worker.process.pid}`);
        worker.kill();
      }
    }

    // 等待所有工作进程退出后，主进程退出
    setTimeout(() => {
      logger.info('All workers shut down, exiting master process');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  logger.info('========================================');
  logger.info('Multi-process cluster initialized');
  logger.info(`Master process: ${process.pid}`);
  logger.info(`Worker processes: ${numCPUs}`);
  logger.info('Load balancing: Round-robin (OS-level)');
  logger.info('========================================\n');
}

/**
 * Main entry point - 根据进程角色启动主进程或工作进程
 */
function main(): void {
  if (cluster.isPrimary) {
    // 主进程：负责管理工作进程和负载均衡
    startMaster();
  } else {
    // 工作进程：启动服务器
    startWorker();
  }
}

main();
