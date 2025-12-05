import type { StatsData } from './Dashboard';

interface StatsOverviewProps {
  stats: StatsData;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const cards = [
    {
      title: '总连接数',
      value: (stats.totalConnections || 0).toLocaleString(),
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>总连接数</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      iconBg: 'bg-blue-500/20',
    },
    {
      title: '活跃连接',
      value: (stats.activeConnections || 0).toString(),
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>活跃连接</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      iconBg: 'bg-green-500/20',
    },
    {
      title: '上传流量',
      value: formatBytes(stats.totalBytesUp || 0),
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>上传流量</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16l-4-4m0 0l4-4m-4 4h18"
          />
        </svg>
      ),
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      iconBg: 'bg-purple-500/20',
    },
    {
      title: '下载流量',
      value: formatBytes(stats.totalBytesDown || 0),
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>下载流量</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      ),
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      iconBg: 'bg-orange-500/20',
    },
    {
      title: '平均耗时',
      value: formatDuration(stats.averageDuration || 0),
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>平均耗时</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      iconBg: 'bg-indigo-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`stat-card bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 ${card.bgColor}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-2">
                {card.title}
              </p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
            <div className={`p-3 rounded-lg ${card.iconBg} ${card.color}`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
