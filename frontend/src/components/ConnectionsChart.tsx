import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ConnectionsChartProps {
  data: Array<{
    hour: string;
    connections: number;
    bytesUp: number;
    bytesDown: number;
  }>;
}

export function ConnectionsChart({ data }: ConnectionsChartProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-lg font-medium text-slate-100 mb-6">连接数统计</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={{ stroke: '#475569' }}
              tickLine={{ stroke: '#475569' }}
            />
            <Tooltip
              labelStyle={{ color: '#e2e8f0' }}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Bar
              dataKey="connections"
              fill="#60a5fa"
              name="连接数"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
