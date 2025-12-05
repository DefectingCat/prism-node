import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { ApiConfigModal } from './components/ApiConfigModal'
import { useApiConfig } from './hooks/useApiConfig'
import './App.css'

function App() {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const { config } = useApiConfig()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">代理服务器统计</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                服务器: {config.baseUrl}
              </span>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                配置
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />
      </main>
      
      <ApiConfigModal 
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  )
}

export default App
