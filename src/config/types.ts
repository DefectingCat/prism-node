/**
 * 从 config.json 加载的配置结构
 */
export interface Config {
  addr: string; // HTTP 代理监听地址（例如："127.0.0.1:8080"）
  socks_addr: string; // SOCKS5 代理地址（例如："127.0.0.1:1080"）
  log_path?: string; // 日志文件路径（空字符串表示不写入日志文件）
  whitelist?: string[]; // 域名白名单，用于直连（例如：["example.com", "*.google.com"]）
}

/**
 * 解析后的地址组件
 */
export interface ParsedAddress {
  host: string;
  port: number;
}
