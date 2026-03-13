import * as fs from 'node:fs/promises';
import JSON5 from 'json5';
import type { Config } from './types';

/**
 * 从 JSON 文件加载并验证配置（支持注释和尾随逗号）
 * @param configPath - 配置文件路径
 * @returns 验证后的配置对象
 * @throws 如果文件无法读取或配置无效则抛出错误
 */
export async function loadConfig(configPath: string): Promise<Config> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON5.parse(content) as Config;

    // 验证必填字段
    if (!config.addr || !config.socks_addr) {
      throw new Error("Config must contain 'addr' and 'socks_addr' properties");
    }

    // 验证 whitelist（可选）
    if (config.whitelist !== undefined) {
      if (!Array.isArray(config.whitelist)) {
        throw new Error('Whitelist must be an array of domain strings');
      }
      // 验证数组中的每个元素都是字符串
      for (let i = 0; i < config.whitelist.length; i++) {
        const domain = config.whitelist[i];
        if (typeof domain !== 'string') {
          throw new Error(`Whitelist entry at index ${i} must be a string`);
        }
        if (!domain.trim()) {
          throw new Error(`Whitelist entry at index ${i} cannot be empty`);
        }
      }
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`加载配置失败: ${error.message}`);
    }
    throw error;
  }
}
