import { useCallback, useEffect, useState } from 'react';
import { useApiConfig } from '../hooks/useApiConfig';
import { ConnectionsChart } from './ConnectionsChart';
import { RecentConnections } from './RecentConnections';
import { StatsOverview } from './StatsOverview';
import { TrafficChart } from './TrafficChart';

export interface StatsData {
  totalConnections: number;
  totalBytesUp: number;
  totalBytesDown: number;
  averageDuration: number;
  activeConnections: number;
  recentConnections: Array<{
    timestamp: number;
    requestId: string;
    type: 'HTTP' | 'HTTPS';
    targetHost: string;
    targetPort: number;
    clientIP: string;
    duration?: number;
    bytesUp: number;
    bytesDown: number;
    status: 'success' | 'error' | 'timeout';
  }>;
  hourlyStats: Array<{
    hour: string;
    connections: number;
    bytesUp: number;
    bytesDown: number;
  }>;
}

export function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { config } = useApiConfig();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = `${config.baseUrl}/stats`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setStats(result.data);
        setError(null);
      } else {
        throw new Error(result.error || '获取统计数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('获取统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [config.baseUrl]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-blue-500"></div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-400">
              加载统计数据时出错
            </h3>
            <div className="mt-2 text-sm text-red-300">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={fetchStats}
                className="bg-red-800/30 hover:bg-red-800/50 px-4 py-2 rounded-lg text-sm font-medium text-red-300 transition-colors duration-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-sm text-yellow-300">数据更新失败: {error}</p>
        </div>
      )}
    </div>
  );
}
