import type { StatsData } from './Dashboard'

interface StatsOverviewProps {
  stats: StatsData
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  const cards = [
    {
      title: '总连接数',
      value: (stats.totalConnections || 0).toLocaleString(),
      icon: '🔗',
      color: 'text-blue-600'
    },
    {
      title: '活跃连接',
      value: (stats.activeConnections || 0).toString(),
      icon: '⚡',
      color: 'text-green-600'
    },
    {
      title: '上传流量',
      value: formatBytes(stats.totalBytesUp || 0),
      icon: '⬆️',
      color: 'text-purple-600'
    },
    {
      title: '下载流量',
      value: formatBytes(stats.totalBytesDown || 0),
      icon: '⬇️',
      color: 'text-orange-600'
    },
    {
      title: '平均耗时',
      value: formatDuration(stats.averageDuration || 0),
      icon: '⏱️',
      color: 'text-indigo-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">{card.icon}</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {card.title}
                  </dt>
                  <dd className={`text-lg font-medium ${card.color}`}>
                    {card.value}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}