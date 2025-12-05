import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrafficChartProps {
  data: Array<{
    hour: string
    connections: number
    bytesUp: number
    bytesDown: number
  }>
}

export function TrafficChart({ data }: TrafficChartProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTooltipBytes = (value: number) => {
    return formatBytes(value)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">流量统计</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hour" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tickFormatter={formatBytes}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={formatTooltipBytes}
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="bytesUp" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              name="上传流量"
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="bytesDown" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="下载流量"
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}