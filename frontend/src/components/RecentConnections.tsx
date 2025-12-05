interface Connection {
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
}

interface RecentConnectionsProps {
  connections: Connection[];
}

export function RecentConnections({ connections }: RecentConnectionsProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const getStatusBadge = (status: string) => {
    const baseClasses =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    switch (status) {
      case 'success':
        return `${baseClasses} bg-green-500/20 text-green-400 border border-green-500/30`;
      case 'error':
        return `${baseClasses} bg-red-500/20 text-red-400 border border-red-500/30`;
      case 'timeout':
        return `${baseClasses} bg-yellow-500/20 text-yellow-400 border border-yellow-500/30`;
      default:
        return `${baseClasses} bg-slate-500/20 text-slate-400 border border-slate-500/30`;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'error':
        return '错误';
      case 'timeout':
        return '超时';
      default:
        return status;
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl">
      <div className="px-6 py-6">
        <h3 className="text-lg leading-6 font-medium text-slate-100 mb-6">
          最近连接记录
        </h3>

        {(connections || []).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">暂无连接记录</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-700/50">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    目标地址
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    客户端IP
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    耗时
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    流量
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800/30 divide-y divide-slate-700/30">
                {(connections || []).map((connection) => (
                  <tr
                    key={connection.requestId}
                    className="hover:bg-slate-700/30 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                      {formatTime(connection.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          connection.type === 'HTTPS'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}
                      >
                        {connection.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200 font-mono">
                      {connection.targetHost}:{connection.targetPort}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                      {connection.clientIP}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDuration(connection.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col space-y-1">
                        <span className="text-purple-400 text-xs">
                          ↑ {formatBytes(connection.bytesUp)}
                        </span>
                        <span className="text-orange-400 text-xs">
                          ↓ {formatBytes(connection.bytesDown)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(connection.status)}>
                        {getStatusText(connection.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
