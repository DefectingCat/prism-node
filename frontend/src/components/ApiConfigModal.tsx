import { useState } from 'react'
import { useApiConfig } from '../hooks/useApiConfig'

interface ApiConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiConfigModal({ isOpen, onClose }: ApiConfigModalProps) {
  const { config, updateConfig, resetConfig } = useApiConfig()
  const [baseUrl, setBaseUrl] = useState(config.baseUrl)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  if (!isOpen) return null

  const handleSave = () => {
    updateConfig({ baseUrl: baseUrl.replace(/\/$/, '') })
    onClose()
  }

  const handleReset = () => {
    resetConfig()
    setBaseUrl('http://localhost:3000')
    setConnectionStatus('idle')
  }

  const testConnection = async () => {
    setIsTestingConnection(true)
    setConnectionStatus('idle')
    
    try {
      const testUrl = baseUrl.replace(/\/$/, '') + '/stats/active'
      const response = await fetch(testUrl, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (response.ok) {
        setConnectionStatus('success')
      } else {
        setConnectionStatus('error')
      }
    } catch (error) {
      setConnectionStatus('error')
    } finally {
      setIsTestingConnection(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              API 服务器配置
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-4">
            <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-2">
              服务器地址
            </label>
            <input
              type="url"
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:3000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              输入后端 API 服务器的完整地址
            </p>
          </div>

          <div className="mb-4">
            <button
              onClick={testConnection}
              disabled={isTestingConnection || !baseUrl}
              className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-700 py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              {isTestingConnection ? '测试连接中...' : '测试连接'}
            </button>
            
            {connectionStatus === 'success' && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">✅ 连接成功</p>
              </div>
            )}
            
            {connectionStatus === 'error' && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">❌ 连接失败，请检查地址是否正确</p>
              </div>
            )}
          </div>

          <div className="flex justify-between space-x-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md text-sm font-medium"
            >
              重置默认
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}