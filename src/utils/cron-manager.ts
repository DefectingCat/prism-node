import cron, { ScheduledTask, TaskContext, TaskOptions } from 'node-cron';
import logger from './logger';

/**
 * 定时任务管理器
 * 负责管理应用程序中的所有定时任务
 */

// 存储所有已创建的定时任务
const tasks = new Map<string, ScheduledTask>();

/**
 * 定时任务配置接口
 */
export interface CronTaskConfig {
  name: string; // 任务名称（唯一标识符）
  schedule: string; // cron 表达式
  callback: (context: TaskContext) => Promise<void> | void; // 任务执行函数
  enabled?: boolean; // 是否启用任务（默认为 true）
  options?: Omit<TaskOptions, 'name'>; // 其他任务选项（不包含 name，因为我们使用自定义的 name）
}

/**
 * 定时任务管理器类
 */
class CronManager {
  /**
   * 添加定时任务
   * @param config 任务配置
   */
  static addTask(config: CronTaskConfig): void {
    const { name, schedule, callback, enabled = true, options = {} } = config;

    // 检查任务是否已存在
    if (tasks.has(name)) {
      logger.warn(`定时任务 "${name}" 已存在，将覆盖旧任务`);
      this.removeTask(name);
    }

    try {
      // 创建定时任务
      const task = cron.schedule(
        schedule,
        async (context) => {
          logger.info(`定时任务 "${name}" 开始执行`);
          try {
            await callback(context);
            logger.info(`定时任务 "${name}" 执行成功`);
          } catch (error) {
            logger.error(`定时任务 "${name}" 执行失败: ${error}`);
          }
        },
        {
          ...options,
          name, // 使用自定义任务名称
        },
      );

      tasks.set(name, task);

      // 根据 enabled 配置决定是否立即启动任务
      if (!enabled) {
        const stopResult = task.stop();
        if (stopResult instanceof Promise) {
          stopResult.catch((error: Error) => {
            logger.error(`停止定时任务 "${name}" 失败: ${error}`);
          });
        }
        logger.info(
          `定时任务 "${name}" 已创建（未启用），执行周期: ${schedule}`,
        );
      } else {
        logger.info(`定时任务 "${name}" 已启用，执行周期: ${schedule}`);
      }
    } catch (error) {
      logger.error(`创建定时任务 "${name}" 失败: ${error}`);
    }
  }

  /**
   * 移除定时任务
   * @param name 任务名称
   */
  static removeTask(name: string): void {
    const task = tasks.get(name);
    if (task) {
      task.destroy();
      tasks.delete(name);
      logger.info(`定时任务 "${name}" 已移除`);
    } else {
      logger.warn(`定时任务 "${name}" 不存在`);
    }
  }

  /**
   * 启动定时任务
   * @param name 任务名称
   */
  static startTask(name: string): void {
    const task = tasks.get(name);
    if (task) {
      task.start();
      logger.info(`定时任务 "${name}" 已启动`);
    } else {
      logger.warn(`定时任务 "${name}" 不存在`);
    }
  }

  /**
   * 停止定时任务
   * @param name 任务名称
   */
  static stopTask(name: string): void {
    const task = tasks.get(name);
    if (task) {
      task.stop();
      logger.info(`定时任务 "${name}" 已停止`);
    } else {
      logger.warn(`定时任务 "${name}" 不存在`);
    }
  }

  /**
   * 获取所有定时任务信息
   * @returns 任务信息数组
   */
  static async getTasksInfo(): Promise<
    Array<{
      name: string;
      id: string;
      status: string;
      nextRun: Date | null;
    }>
  > {
    return Promise.all(
      Array.from(tasks.entries()).map(async ([name, task]) => {
        const status = await task.getStatus();
        return {
          name,
          id: task.id,
          status,
          nextRun: task.getNextRun(),
        };
      }),
    );
  }

  /**
   * 启动所有定时任务
   */
  static startAllTasks(): void {
    let count = 0;
    tasks.forEach((task, name) => {
      try {
        task.start();
        count++;
        logger.info(`定时任务 "${name}" 已启动`);
      } catch (error) {
        logger.error(`启动定时任务 "${name}" 失败: ${error}`);
      }
    });
    logger.info(`已启动 ${count} 个定时任务`);
  }

  /**
   * 停止所有定时任务
   */
  static stopAllTasks(): void {
    let count = 0;
    tasks.forEach((task, name) => {
      try {
        task.stop();
        count++;
        logger.info(`定时任务 "${name}" 已停止`);
      } catch (error) {
        logger.error(`停止定时任务 "${name}" 失败: ${error}`);
      }
    });
    logger.info(`已停止 ${count} 个定时任务`);
  }

  /**
   * 销毁所有定时任务
   */
  static destroyAllTasks(): void {
    let count = 0;
    tasks.forEach((task, name) => {
      try {
        task.destroy();
        count++;
        logger.info(`定时任务 "${name}" 已销毁`);
      } catch (error) {
        logger.error(`销毁定时任务 "${name}" 失败: ${error}`);
      }
    });
    tasks.clear();
    logger.info(`已销毁所有 ${count} 个定时任务`);
  }
}

export default CronManager;
