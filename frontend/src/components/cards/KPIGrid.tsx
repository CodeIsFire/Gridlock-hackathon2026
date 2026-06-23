'use client'
import { motion } from 'framer-motion'
import {
  Activity, Shield, MapPin, AlertTriangle,
  Eye, TrendingUp, TrendingDown
} from 'lucide-react'
import clsx from 'clsx'

interface KPI {
  label: string
  value: string | number
  trend?: number
  icon: React.ElementType
  accent?: string
  sub?: string
}

function KPICard({ kpi, delay }: { kpi: KPI; delay: number }) {
  const positive = (kpi.trend ?? 0) > 0
  const TrendIcon = positive ? TrendingUp : TrendingDown

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="kpi-card"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={clsx(
          'w-9 h-9 rounded-lg flex items-center justify-center',
          kpi.accent || 'bg-primary/10 border border-primary/20'
        )}>
          <kpi.icon className="w-4 h-4 text-primary" />
        </div>
        {kpi.trend !== undefined && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full',
            positive
              ? 'text-red-400 bg-red-500/10'    // more violations = bad
              : 'text-green-400 bg-green-500/10'
          )}>
            <TrendIcon className="w-3 h-3" />
            {Math.abs(kpi.trend)}%
          </div>
        )}
      </div>

      <div className="font-display text-2xl font-bold text-text-primary mb-1">
        {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
      </div>
      <div className="text-xs text-text-muted">{kpi.label}</div>
      {kpi.sub && (
        <div className="text-xs text-text-muted mt-1 opacity-60">{kpi.sub}</div>
      )}
    </motion.div>
  )
}

export default function KPIGrid({ data }: { data: any }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="kpi-card animate-pulse">
            <div className="h-9 w-9 rounded-lg bg-surface mb-4" />
            <div className="h-7 w-16 bg-surface rounded mb-2" />
            <div className="h-3 w-24 bg-surface rounded" />
          </div>
        ))}
      </div>
    )
  }

  const kpis: KPI[] = [
    {
      label: 'Total Violations',
      value: data.total_violations,
      trend: data.violation_growth_rate,
      icon: Activity,
    },
    {
      label: 'Police Stations',
      value: data.police_stations,
      icon: Shield,
    },
    {
      label: 'Junctions Monitored',
      value: data.named_junctions,
      icon: MapPin,
    },
    {
      label: 'Repeat Offenders',
      value: data.repeat_offenders,
      icon: AlertTriangle,
    },
    {
      label: 'High-Risk Zones',
      value: data.high_risk_zones || '—',
      icon: Eye,
    },
    {
      label: 'MoM Growth Rate',
      value: `${data.violation_growth_rate > 0 ? '+' : ''}${data.violation_growth_rate}%`,
      trend: data.violation_growth_rate,
      icon: TrendingUp,
      sub: 'vs. previous month',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi, i) => (
        <KPICard key={kpi.label} kpi={kpi} delay={i * 0.06} />
      ))}
    </div>
  )
}
