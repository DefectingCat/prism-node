import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Context } from 'hono';
import logger from '../utils/logger';

/**
 * About 页面处理器
 * 负责读取并返回 README.md 文件内容
 */
class AboutHandler {
  /**
   * 读取 README.md 文件内容
   * 文件位于构建后的 dist 目录中
   */
  private async readReadmeFile(): Promise<string> {
    try {
      // README.md 文件在构建时被复制到 dist 目录
      const readmePath = join(process.cwd(), 'dist', 'README.md');

      logger.debug('Reading README.md file', { path: readmePath });

      const content = await readFile(readmePath, 'utf-8');

      logger.info('README.md file read successfully', {
        contentLength: content.length,
      });

      return content;
    } catch (error) {
      logger.error('Failed to read README.md file', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * 处理 GET /api/about 请求
   * 返回 README.md 文件内容
   *
   * @param c - Hono 上下文对象
   * @returns JSON 响应，包含 README.md 内容
   */
  async getAbout(c: Context) {
    try {
      const content = await this.readReadmeFile();

      return c.json({
        success: true,
        data: {
          content,
        },
      });
    } catch (error) {
      // 文件读取失败时返回错误响应
      return c.json(
        {
          success: false,
          error: '无法读取 README 文件，请确保项目已正确构建',
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  }
}

// 导出单例实例
export const aboutHandler = new AboutHandler();
