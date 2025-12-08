#!/usr/bin/env node

const http = require('node:http');
const https = require('node:https');
const { performance } = require('node:perf_hooks');
const url = require('node:url');

class StressTest {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.concurrency = options.concurrency || 10;
    this.totalRequests = options.totalRequests || 100;
    this.timeout = options.timeout || 5000;
    this.endpoints = options.endpoints || ['/'];

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
      const targetUrl = this.baseUrl + endpoint;
      const parsedUrl = url.parse(targetUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
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
    console.log(`目标URL: ${this.baseUrl}`);
    console.log(`并发数: ${this.concurrency}`);
    console.log(`总请求数: ${this.totalRequests}`);
    console.log(`测试端点: ${this.endpoints.join(', ')}`);
    console.log('');

    const startTime = performance.now();
    let completedRequests = 0;

    for (const endpoint of this.endpoints) {
      console.log(`\n测试端点: ${endpoint}`);

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
  -u, --url <url>           目标服务器URL (默认: http://localhost:3000)
  -c, --concurrency <num>   并发连接数 (默认: 10)
  -r, --requests <num>      总请求数 (默认: 100)
  -t, --timeout <ms>        请求超时时间 (默认: 5000ms)
  -e, --endpoints <list>    测试端点列表，用逗号分隔 (默认: /)
  -h, --help               显示帮助信息

示例:
  node api-stress-test.js -u http://localhost:8080 -c 20 -r 1000
  node api-stress-test.js -e "/api/users,/api/posts,/api/comments"
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

if (require.main === module) {
  const options = parseArgs();
  const test = new StressTest(options);
  test.run().catch(console.error);
}

module.exports = StressTest;
