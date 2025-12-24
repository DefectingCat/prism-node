import { useApiConfig } from '../hooks/useApiConfig';

/**
 * API 请求工具函数示例
 * 展示如何在实际请求中使用配置的基础 URL
 */

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
 * 示例：如何在组件中使用
 *
 * import { useApiFetch } from '../utils/api';
 *
 * const MyComponent = () => {
 *   const apiFetch = useApiFetch();
 *
 *   const fetchData = async () => {
 *     try {
 *       const data = await apiFetch('/endpoint');
 *       console.log(data);
 *     } catch (error) {
 *       console.error('Error fetching data:', error);
 *     }
 *   };
 *
 *   return <button onClick={fetchData}>Fetch Data</button>;
 * };
 */
