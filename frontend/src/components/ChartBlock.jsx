import { useId } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts"

export const fmt = (v) => {
  if (typeof v !== "number") return String(v)
  if (Math.abs(v) >= 1000000) return `$${(v / 1000000).toFixed(2)}M`
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}K`
  return `$${v.toFixed(2)}`
}

/** Recharts panel used on dashboard and preview step */
export function ChartBlock({ dashboard, colors, height = 220 }) {
  const gradId = useId().replace(/:/g, "")
  const { chart_type, data } = dashboard
  if (!data?.length) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12 }}>
        No data
      </div>
    )
  }
  const margin = { top: 8, right: 8, left: 0, bottom: height > 180 ? 45 : 20 }
  const tick = { fill: "#94a3b8", fontSize: height > 180 ? 11 : 9 }
  const grid = { stroke: "#f1f5f9", strokeDasharray: "3 3" }
  const tip = {
    contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
    labelStyle: { color: "#0f172a", fontWeight: 600 },
  }

  if (chart_type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={margin} barCategoryGap="35%">
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="name" tick={{ ...tick, angle: -28, textAnchor: "end" }} interval={0} axisLine={false} tickLine={false} />
          <YAxis tick={tick} tickFormatter={fmt} axisLine={false} tickLine={false} width={54} />
          <Tooltip formatter={(v) => [fmt(v)]} {...tip} cursor={{ fill: `${colors[0]}10` }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (chart_type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={margin}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="name" tick={{ ...tick, angle: -28, textAnchor: "end" }} interval={0} axisLine={false} tickLine={false} />
          <YAxis tick={tick} tickFormatter={fmt} axisLine={false} tickLine={false} width={54} />
          <Tooltip formatter={(v) => [fmt(v)]} {...tip} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors[0]}
            strokeWidth={2.5}
            dot={{ fill: colors[0], r: height > 180 ? 4 : 2, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (chart_type === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={margin}>
          <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors[0]} stopOpacity={0.12} />
            <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...grid} />
        <XAxis dataKey="name" tick={{ ...tick, angle: -28, textAnchor: "end" }} interval={0} axisLine={false} tickLine={false} />
        <YAxis tick={tick} tickFormatter={fmt} axisLine={false} tickLine={false} width={54} />
        <Tooltip formatter={(v) => [fmt(v)]} {...tip} />
        <Area type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5} fill={`url(#${gradId})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (chart_type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            outerRadius={height > 180 ? 80 : 44}
            innerRadius={height > 180 ? 28 : 12}
            paddingAngle={2}
            label={height > 180 ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
            labelLine={height > 180}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [fmt(v)]} {...tip} />
          {height > 180 && <Legend formatter={(v) => <span style={{ fontSize: 11, color: "#475569" }}>{v}</span>} />}
        </PieChart>
      </ResponsiveContainer>
    )
  }
  return null
}
