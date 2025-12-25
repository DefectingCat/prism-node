import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Context } from 'hono';
import logger from '../utils/logger';

/**
 * About 页面处理器
 * 负责读取并返回 README 文件内容，支持多语言版本（中文/英文）
 */
class AboutHandler {
  /**
   * 读取 README 文件内容（支持多语言）
   * 文件位于构建后的 dist 目录中
   *
   * @param language - 语言代码，支持 'zh'/'zh-CN'（中文）或 'en'/'en-US'（英文），默认为英文
   * @returns README 文件内容
   */
  private async readReadmeFile(language = 'en'): Promise<string> {
    try {
      // 根据语言参数决定读取哪个 README 文件
      // zh 或 zh-CN 读取中文版 README-zh.md
      // 其他情况（包括 en、en-US 或无参数）读取英文版 README.md
      const fileName =
        language === 'zh' || language === 'zh-CN' ? 'README-zh.md' : 'README.md';
      const readmePath = join(process.cwd(), 'dist', fileName);

      logger.debug('Reading README file', { path: readmePath, language });

      const content = await readFile(readmePath, 'utf-8');

      logger.info('README file read successfully', {
        fileName,
        language,
        contentLength: content.length,
      });

      return content;
    } catch (error) {
      logger.error('Failed to read README file', {
        language,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * 处理 GET /api/about 请求
   * 返回 README 文件内容，支持多语言版本
   *
   * @param c - Hono 上下文对象
   * @returns JSON 响应，包含 README 内容
   *
   * @description
   * 支持通过查询参数 'lang' 或 'language' 指定语言版本：
   * - 'zh' 或 'zh-CN'：返回中文版 README-zh.md
   * - 'en' 或 'en-US' 或无参数：返回英文版 README.md
   *
   * @example
   * GET /api/about          -> 返回英文版
   * GET /api/about?lang=zh  -> 返回中文版
   * GET /api/about?language=zh-CN -> 返回中文版
   */
  async getAbout(c: Context) {
    try {
      // 从查询参数中获取语言设置，优先使用 'lang'，其次使用 'language'
      // 如果都没有提供，则默认为英文 'en'
      const lang = c.req.query('lang') || c.req.query('language') || 'en';

      logger.debug('About request received', { lang });

      const content = await this.readReadmeFile(lang);

      return c.json({
        success: true,
        data: {
          content,
          language: lang, // 返回当前使用的语言标识
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
