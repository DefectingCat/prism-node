import { useContext } from 'react';
import { ApiConfigContext } from '../contexts/ApiConfigContext';

/**
 * 自定义 Hook 用于访问 API 配置上下文
 * 必须在 ApiConfigProvider 内部使用
 */
export const useApiConfig = () => {
  const context = useContext(ApiConfigContext);
  if (context === undefined) {
    throw new Error('useApiConfig must be used within an ApiConfigProvider');
  }
  return context;
};
