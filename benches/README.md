# API 压力测试工具

## 使用方法

### 基本用法
```bash
node benches/api-stress-test.js
```

### 高级用法
```bash
# 测试特定URL，设置并发数和请求总数
node benches/api-stress-test.js -u http://localhost:8080 -c 20 -r 1000

# 测试多个端点
node benches/api-stress-test.js -e "/api/users,/api/posts,/api/comments"

# 设置超时时间
node benches/api-stress-test.js -t 10000
```

## 参数说明

- `-u, --url <url>`: 目标服务器URL (默认: http://localhost:3000)
- `-c, --concurrency <num>`: 并发连接数 (默认: 10)
- `-r, --requests <num>`: 总请求数 (默认: 100)
- `-t, --timeout <ms>`: 请求超时时间 (默认: 5000ms)
- `-e, --endpoints <list>`: 测试端点列表，用逗号分隔 (默认: /)
- `-h, --help`: 显示帮助信息

## 输出结果

测试完成后会显示：
- 总测试时间
- 成功/失败请求数
- 成功率
- 每秒请求数 (RPS)
- 响应时间统计（平均/最小/最大）
- HTTP状态码分布
- 错误统计

## 示例输出

```
开始压力测试:
目标URL: http://localhost:3000
并发数: 10
总请求数: 100
测试端点: /

测试端点: /
进度: [██████████████████████████████████████████████████] 100% (100/100)

测试完成！

========== 测试结果 ==========
总测试时间: 2.45 秒
总请求数: 100
成功请求: 98
失败请求: 2
成功率: 98.00%
请求/秒: 40.82

响应时间统计:
  平均: 245.67 ms
  最小: 123.45 ms
  最大: 1234.56 ms

HTTP状态码分布:
  200: 98 次

错误统计:
  Request timeout: 2 次
```