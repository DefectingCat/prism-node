import { useApiConfigStore } from '../stores/useApiConfigStore';

/**
 * 自定义 Hook 用于访问 API 配置状态
 * 使用 zustand store 管理 API 配置
 */
export const useApiConfig = () => {
  const baseUrl = useApiConfigStore((state) => state.baseUrl);
  const setBaseUrl = useApiConfigStore((state) => state.setBaseUrl);

  return { baseUrl, setBaseUrl };
};
