import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TrafficChartProps {
  data: Array<{
    hour: string;
    connections: number;
    bytesUp: number;
    bytesDown: number;
  }>;
}

export function TrafficChart({ data }: TrafficChartProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const formatTooltipBytes = (value: number) => {
    return formatBytes(value);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-lg font-medium text-slate-100 mb-6">流量统计</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#475569"
              opacity={0.3}
            />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={{ stroke: '#475569' }}
              tickLine={{ stroke: '#475569' }}
            />
            <YAxis
              tickFormatter={formatBytes}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={{ stroke: '#475569' }}
              tickLine={{ stroke: '#475569' }}
            />
            <Tooltip
              formatter={formatTooltipBytes}
              labelStyle={{ color: '#e2e8f0' }}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Line
              type="monotone"
              dataKey="bytesUp"
              stroke="#a78bfa"
              strokeWidth={3}
              name="上传流量"
              dot={{ fill: '#a78bfa', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, fill: '#a78bfa' }}
            />
            <Line
              type="monotone"
              dataKey="bytesDown"
              stroke="#fb923c"
              strokeWidth={3}
              name="下载流量"
              dot={{ fill: '#fb923c', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, fill: '#fb923c' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
