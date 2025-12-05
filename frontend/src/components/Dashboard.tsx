import { useState, useEffect } from 'react'
import { StatsOverview } from './StatsOverview'
import { TrafficChart } from './TrafficChart'
import { ConnectionsChart } from './ConnectionsChart'
import { RecentConnections } from './RecentConnections'
import { useApiConfig } from '../hooks/useApiConfig'

export interface StatsData {
  totalConnections: number
  totalBytesUp: number
  totalBytesDown: number
  averageDuration: number
  activeConnections: number
  recentConnections: Array<{
    timestamp: number
    requestId: string
    type: 'HTTP' | 'HTTPS'
    targetHost: string
    targetPort: number
    clientIP: string
    duration?: number
    bytesUp: number
    bytesDown: number
    status: 'success' | 'error' | 'timeout'
  }>
  hourlyStats: Array<{
    hour: string
    connections: number
    bytesUp: number
    bytesDown: number
  }>
}

export function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { config } = useApiConfig()

  const fetchStats = async () => {
    try {
      setLoading(true)
      const apiUrl = `${config.baseUrl}/stats`
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setStats(result.data)
        setError(null)
      } else {
        throw new Error(result.error || '获取统计数据失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
      console.error('获取统计数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [config.baseUrl])

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              加载统计数据时出错
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchStats}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {stats && (
        <>
          <StatsOverview stats={stats} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrafficChart data={stats.hourlyStats} />
            <ConnectionsChart data={stats.hourlyStats} />
          </div>
          
          <RecentConnections connections={stats.recentConnections} />
        </>
      )}
      
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-700">
            数据更新失败: {error}
          </p>
        </div>
      )}
    </div>
  )
}