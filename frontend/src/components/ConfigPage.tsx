import { useState } from 'react';
import { useApiConfig } from '../hooks/useApiConfig';

export function ConfigPage() {
  const { config, updateConfig, resetConfig } = useApiConfig();
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSave = () => {
    updateConfig({ baseUrl });
    setTestResult({ success: true, message: '配置已保存' });
  };

  const handleReset = () => {
    resetConfig();
    setBaseUrl('http://localhost:3000/api');
    setTestResult({ success: true, message: '配置已重置' });
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const testUrl = `${baseUrl.replace(/\/$/, '')}/stats/active`;
      const response = await fetch(testUrl);

      if (response.ok) {
        setTestResult({ success: true, message: '连接测试成功' });
      } else {
        setTestResult({
          success: false,
          message: `连接失败: HTTP ${response.status}`,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl">
        <div className="px-6 py-6">
          <h3 className="text-lg leading-6 font-medium text-slate-100 mb-6">
            API 配置
          </h3>

          <div className="space-y-6">
            <div>
              <label
                htmlFor="baseUrl"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                服务器地址
              </label>
              <input
                type="url"
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="block w-full rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 sm:text-sm px-3 py-2 transition-colors duration-200"
                placeholder="http://localhost:3000/api"
              />
              <p className="mt-2 text-sm text-slate-400">
                代理服务器的 API 基础地址
              </p>
            </div>

            {testResult && (
              <div
                className={`rounded-lg p-4 border backdrop-blur-sm ${testResult.success ? 'bg-green-900/20 border-green-800/50' : 'bg-red-900/20 border-red-800/50'}`}
              >
                <p
                  className={`text-sm ${testResult.success ? 'text-green-300' : 'text-red-300'}`}
                >
                  {testResult.message}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={testConnection}
                disabled={isTestingConnection}
                className="inline-flex items-center px-4 py-2 border border-slate-600/50 text-sm font-medium rounded-lg text-slate-300 bg-slate-700/50 hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
              >
                {isTestingConnection ? '测试中...' : '测试连接'}
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                保存配置
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center px-4 py-2 border border-slate-600/50 text-sm font-medium rounded-lg text-slate-300 bg-slate-700/50 hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl">
        <div className="px-6 py-6">
          <h3 className="text-lg leading-6 font-medium text-slate-100 mb-4">
            当前配置
          </h3>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-slate-400">服务器地址</dt>
              <dd className="mt-1 text-sm text-slate-200 font-mono">
                {config.baseUrl}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
