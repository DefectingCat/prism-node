import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { useApiConfig } from '../hooks/useApiConfig';
import type {
  ActiveConnectionsData,
  ApiResponse,
  StatsData,
  StatsQueryParams,
} from '../types/stats';

/**
 * API 请求工具函数
 * 提供统一的 HTTP 请求接口，使用 axios 库
 */

/**
 * 创建 axios 实例
 */
const createAxiosInstance = (baseUrl: string): AxiosInstance => {
  const instance = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 响应拦截器：统一处理错误
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const errorMessage = error.response?.data
        ? String(
            (error.response.data as { error?: string }).error || error.message,
          )
        : error.message;

      console.error('API request failed:', errorMessage);
      return Promise.reject(new Error(errorMessage));
    },
  );

  return instance;
};

/**
 * 自定义 Hook：用于创建带有配置 baseUrl 的 fetch 函数
 * @example
 * const apiFetch = useApiFetch();
 * const data = await apiFetch('/users');
 */
export const useApiFetch = () => {
  const { baseUrl } = useApiConfig();

  const apiFetch = async (endpoint: string, options?: RequestInit) => {
    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  };

  return apiFetch;
};

/**
 * 自定义 Hook：用于统计接口调用
 */
export const useStatsApi = () => {
  const { baseUrl } = useApiConfig();
  const axiosInstance = createAxiosInstance(baseUrl);

  /**
   * 获取综合统计信息
   * @param params 查询参数
   * @returns 统计数据
   */
  const getStats = async (params?: StatsQueryParams): Promise<StatsData> => {
    const response = await axiosInstance.get<ApiResponse<StatsData>>('/stats', {
      params,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || '获取统计信息失败');
    }

    return response.data.data;
  };

  /**
   * 获取当前活跃连接数
   * @returns 活跃连接数据
   */
  const getActiveConnections = async (): Promise<number> => {
    const response =
      await axiosInstance.get<ApiResponse<ActiveConnectionsData>>(
        '/stats/active',
      );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || '获取活跃连接数失败');
    }

    return response.data.data.activeConnections;
  };

  return {
    getStats,
    getActiveConnections,
  };
};

/**
 * 示例：如何在组件中使用统计 API
 *
 * import { useStatsApi } from '../utils/api';
 *
 * const StatsComponent = () => {
 *   const { getStats, getActiveConnections } = useStatsApi();
 *
 *   const fetchStats = async () => {
 *     try {
 *       const stats = await getStats({
 *         page: 1,
 *         pageSize: 10,
 *         type: 'HTTP',
 *       });
 *       console.log('Statistics:', stats);
 *     } catch (error) {
 *       console.error('Error fetching stats:', error);
 *     }
 *   };
 *
 *   const fetchActiveConnections = async () => {
 *     try {
 *       const count = await getActiveConnections();
 *       console.log('Active connections:', count);
 *     } catch (error) {
 *       console.error('Error fetching active connections:', error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={fetchStats}>Get Statistics</button>
 *       <button onClick={fetchActiveConnections}>Get Active Connections</button>
 *     </div>
 *   );
 * };
 */
