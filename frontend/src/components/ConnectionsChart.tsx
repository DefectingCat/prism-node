import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ConnectionsChartProps {
  data: Array<{
    hour: string
    connections: number
    bytesUp: number
    bytesDown: number
  }>
}

export function ConnectionsChart({ data }: ConnectionsChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">连接数统计</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hour" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            <Bar 
              dataKey="connections" 
              fill="#3b82f6" 
              name="连接数"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}