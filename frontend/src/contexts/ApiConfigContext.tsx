import { createContext, useCallback, useState } from 'react';

/**
 * API 配置上下文类型
 */
export interface ApiConfigContextType {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
}

/**
 * 创建 API 配置上下文
 */
const ApiConfigContext = createContext<ApiConfigContextType | undefined>(
  undefined,
);

/**
 * API 配置上下文 Provider
 * 管理全局 API 基础 URL 配置
 */
export const ApiConfigProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // 初始化 API 基础 URL
  const getInitialBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('apiBaseUrl') || '/api';
    }
    return '/api';
  };

  const [baseUrl, setBaseUrlState] = useState<string>(getInitialBaseUrl);

  /**
   * 设置新的基础 URL
   */
  const setBaseUrl = useCallback((newUrl: string) => {
    setBaseUrlState(newUrl);
    localStorage.setItem('apiBaseUrl', newUrl);
  }, []);

  return (
    <ApiConfigContext.Provider value={{ baseUrl, setBaseUrl }}>
      {children}
    </ApiConfigContext.Provider>
  );
};

export { ApiConfigContext };
