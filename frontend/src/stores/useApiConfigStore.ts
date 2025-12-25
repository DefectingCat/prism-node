import { create } from 'zustand';

/**
 * API 配置 Store 类型
 */
interface ApiConfigStore {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
}

/**
 * 获取初始 API 基础 URL
 */
const getInitialBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('apiBaseUrl') || '/api';
  }
  return '/api';
};

/**
 * API 配置 Store
 * 管理全局 API 基础 URL 配置
 */
export const useApiConfigStore = create<ApiConfigStore>((set) => ({
  baseUrl: getInitialBaseUrl(),
  setBaseUrl: (newUrl: string) => {
    localStorage.setItem('apiBaseUrl', newUrl);
    set({ baseUrl: newUrl });
  },
}));
