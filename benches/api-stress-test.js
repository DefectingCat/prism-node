#!/usr/bin/env node

import http from 'node:http';
import https from 'node:https';
import { performance } from 'node:perf_hooks';


class StressTest {
  constructor(options = {}) {
    // 解析基础URL，提取主机部分和路径部分
    const baseUrl = options.baseUrl || 'http://localhost:3000';
    const baseUrlObj = new URL(baseUrl);

    // 基础URL的主机部分（协议+主机+端口）
    this.baseHost = `${baseUrlObj.protocol}//${baseUrlObj.host}`;

    // 基础URL的路径部分
    this.basePath = baseUrlObj.pathname;

    this.concurrency = options.concurrency || 10;
    this.totalRequests = options.totalRequests || 100;
    this.timeout = options.timeout || 5000;

    // 如果基础URL包含路径，且没有指定端点，则使用基础URL的路径作为端点
    if (this.basePath && this.basePath !== '/' && (!options.endpoints || options.endpoints.length === 0 || (options.endpoints.length === 1 && options.endpoints[0] === '/'))) {
      this.endpoints = [this.basePath];
    } else {
      this.endpoints = options.endpoints || ['/'];
    }

    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: {},
      statusCodes: {},
    };
  }

  async makeRequest(endpoint) {
    return new Promise((resolve) => {
      const startTime = performance.now();

      // 构建目标 URL
      let targetUrl;
      if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        // 如果 endpoint 已经是完整 URL，直接使用
        targetUrl = endpoint;
      } else {
        // 如果 endpoint 以 / 开头，则相对于主机
        // 否则相对于基础路径
        if (endpoint.startsWith('/')) {
          targetUrl = `${this.baseHost}${endpoint}`;
        } else {
          // 移除基础路径末尾的斜杠（如果有）
          const basePath = this.basePath.endsWith('/')
            ? this.basePath.slice(0, -1)
            : this.basePath;
          targetUrl = `${this.baseHost}${basePath}/${endpoint}`;
        }
      }

      const parsedUrl = new URL(targetUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        timeout: this.timeout,
        headers: {
          'User-Agent': 'API-Stress-Test/1.0',
        },
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;

          resolve({
            success: true,
            statusCode: res.statusCode,
            responseTime,
            size: Buffer.byteLength(data, 'utf8'),
          });
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        resolve({
          success: false,
          error: error.message,
          responseTime,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        resolve({
          success: false,
          error: 'Request timeout',
          responseTime,
        });
      });

      req.end();
    });
  }

  async runBatch(batchSize, endpoint) {
    const promises = [];
    for (let i = 0; i < batchSize; i++) {
      promises.push(this.makeRequest(endpoint));
    }
    return Promise.all(promises);
  }

  updateResults(response) {
    this.results.totalRequests++;
    this.results.totalTime += response.responseTime;
    this.results.minTime = Math.min(
      this.results.minTime,
      response.responseTime,
    );
    this.results.maxTime = Math.max(
      this.results.maxTime,
      response.responseTime,
    );

    if (response.success) {
      this.results.successfulRequests++;
      const statusCode = response.statusCode;
      this.results.statusCodes[statusCode] =
        (this.results.statusCodes[statusCode] || 0) + 1;
    } else {
      this.results.failedRequests++;
      const error = response.error;
      this.results.errors[error] = (this.results.errors[error] || 0) + 1;
    }
  }

  printProgress(completed, total) {
    const percentage = Math.round((completed / total) * 100);
    const progressBar =
      '█'.repeat(Math.floor(percentage / 2)) +
      '░'.repeat(50 - Math.floor(percentage / 2));
    process.stdout.write(
      `\r进度: [${progressBar}] ${percentage}% (${completed}/${total})`,
    );
  }

  async run() {
    console.log(`开始压力测试:`);
    console.log(`基础主机: ${this.baseHost}`);
    if (this.basePath && this.basePath !== '/') {
      console.log(`基础路径: ${this.basePath}`);
    }
    console.log(`并发数: ${this.concurrency}`);
    console.log(`总请求数: ${this.totalRequests}`);
    console.log(`测试端点: ${this.endpoints.join(', ')}`);
    console.log('');

    const startTime = performance.now();
    let completedRequests = 0;

    for (const endpoint of this.endpoints) {
      // 显示完整的请求 URL
      let requestUrl;
      if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        requestUrl = endpoint;
      } else {
        if (endpoint.startsWith('/')) {
          requestUrl = `${this.baseHost}${endpoint}`;
        } else {
          const basePath = this.basePath.endsWith('/')
            ? this.basePath.slice(0, -1)
            : this.basePath;
          requestUrl = `${this.baseHost}${basePath}/${endpoint}`;
        }
      }
      console.log(`\n测试端点: ${requestUrl}`);

      const requestsPerEndpoint = Math.floor(
        this.totalRequests / this.endpoints.length,
      );
      const batches = Math.ceil(requestsPerEndpoint / this.concurrency);

      for (let batch = 0; batch < batches; batch++) {
        const remainingRequests =
          requestsPerEndpoint - batch * this.concurrency;
        const batchSize = Math.min(this.concurrency, remainingRequests);

        if (batchSize <= 0) break;

        const responses = await this.runBatch(batchSize, endpoint);
        responses.forEach((response) => {
          this.updateResults(response);
        });

        completedRequests += batchSize;
        this.printProgress(completedRequests, this.totalRequests);
      }
    }

    const endTime = performance.now();
    const totalTestTime = endTime - startTime;

    console.log('\n\n测试完成！');
    this.printResults(totalTestTime);
  }

  printResults(totalTestTime) {
    const avgResponseTime = this.results.totalTime / this.results.totalRequests;
    const requestsPerSecond =
      (this.results.totalRequests / totalTestTime) * 1000;

    console.log('\n========== 测试结果 ==========');
    console.log(`总测试时间: ${(totalTestTime / 1000).toFixed(2)} 秒`);
    console.log(`总请求数: ${this.results.totalRequests}`);
    console.log(`成功请求: ${this.results.successfulRequests}`);
    console.log(`失败请求: ${this.results.failedRequests}`);
    console.log(
      `成功率: ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`,
    );
    console.log(`请求/秒: ${requestsPerSecond.toFixed(2)}`);
    console.log('');
    console.log('响应时间统计:');
    console.log(`  平均: ${avgResponseTime.toFixed(2)} ms`);
    console.log(`  最小: ${this.results.minTime.toFixed(2)} ms`);
    console.log(`  最大: ${this.results.maxTime.toFixed(2)} ms`);

    if (Object.keys(this.results.statusCodes).length > 0) {
      console.log('\nHTTP状态码分布:');
      Object.entries(this.results.statusCodes)
        .sort(([a], [b]) => a - b)
        .forEach(([code, count]) => {
          console.log(`  ${code}: ${count} 次`);
        });
    }

    if (Object.keys(this.results.errors).length > 0) {
      console.log('\n错误统计:');
      Object.entries(this.results.errors)
        .sort(([, a], [, b]) => b - a)
        .forEach(([error, count]) => {
          console.log(`  ${error}: ${count} 次`);
        });
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    baseUrl: 'http://localhost:3000',
    concurrency: 10,
    totalRequests: 100,
    timeout: 5000,
    endpoints: ['/'],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--url':
      case '-u':
        options.baseUrl = args[++i];
        break;
      case '--concurrency':
      case '-c':
        options.concurrency = parseInt(args[++i], 10);
        break;
      case '--requests':
      case '-r':
        options.totalRequests = parseInt(args[++i], 10);
        break;
      case '--timeout':
      case '-t':
        options.timeout = parseInt(args[++i], 10);
        break;
      case '--endpoints':
      case '-e':
        options.endpoints = args[++i].split(',');
        break;
      case '--help':
      case '-h':
        console.log(`
API 压力测试工具

用法: node api-stress-test.js [选项]

选项:
  -u, --url <url>           基础服务器URL (默认: http://localhost:3000)
                            可以是：
                            - 仅包含协议、主机和端口（如 http://localhost:3000）
                            - 包含完整路径（如 http://localhost:3000/api/stats）
  -c, --concurrency <num>   并发连接数 (默认: 10)
  -r, --requests <num>      总请求数 (默认: 100)
  -t, --timeout <ms>        请求超时时间 (默认: 5000ms)
  -e, --endpoints <list>    测试端点列表，用逗号分隔
                            如果不指定，当基础URL包含路径时，会自动使用该路径
                            端点可以是：
                            - 绝对路径（如 /api/stats）
                            - 相对于基础URL的路径（如 stats，当基础URL包含路径时）
                            - 完整URL（如 http://example.com/api/stats）
  -h, --help               显示帮助信息

使用方式：
1. 直接测试包含路径的基础URL（推荐）：
   node api-stress-test.js -u http://localhost:3000/api/stats -c 10 -r 1000

2. 测试基础URL下的多个端点：
   node api-stress-test.js -u http://localhost:3000 -e "/api/stats,/api/hello" -c 20 -r 1000

3. 测试相对路径：
   node api-stress-test.js -u http://localhost:3000/api -e "stats,hello" -c 10 -r 500

4. 直接测试完整URL：
   node api-stress-test.js -e "http://localhost:3000/api/stats" -c 5 -r 100

5. 测试默认端点（根路径）：
   node api-stress-test.js -u http://localhost:3000 -c 10 -r 100

6. 测试不同服务器的端点：
   node api-stress-test.js -e "http://api1.example.com/endpoint,http://api2.example.com/endpoint" -c 5 -r 200
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// ES Module 的主模块检查
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const test = new StressTest(options);
  test.run().catch(console.error);
}

export default StressTest;
