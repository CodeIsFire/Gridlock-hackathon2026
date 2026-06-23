'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { analyticsAPI } from '@/lib/api'
import { useStore } from '@/store'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import clsx from 'clsx'

const COLORS = ['#00D4FF', '#F59E0B', '#EF4444', '#22C55E', '#8B5CF6', '#F97316', '#EC4899', '#14B8A6']

const RISK_COLORS: Record<string, string> = {
  Critical: '#EF4444', High: '#F97316', Moderate: '#F59E0B', Low: '#22C55E',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg p-3 border border-border text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  )
}

function Panel({ title, sub, children, className }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('glass rounded-xl border border-border p-5', className)}
    >
      <div className="text-xs font-mono text-text-muted mb-1">{sub}</div>
      <div className="text-sm font-display font-semibold mb-4">{title}</div>
      {children}
    </motion.div>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { filters } = useStore()
  const [temporal, setTemporal] = useState<any>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [violations, setViolations] = useState<any[]>([])
  const [stations, setStations] = useState<any[]>([])
  const [offenders, setOffenders] = useState<any[]>([])
  const [hotspots, setHotspots] = useState<any[]>([])
  const [junctions, setJunctions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const params = filters as Record<string, string>
    setLoading(true)
    try {
      const [tRes, vRes, vtRes, sRes, oRes, hRes, jRes] = await Promise.all([
        analyticsAPI.temporal(params),
        analyticsAPI.vehicles(params),
        analyticsAPI.violationTypes(params),
        analyticsAPI.stations(params),
        analyticsAPI.offenders({ ...params, limit: '20' }),
        analyticsAPI.hotspots(params),
        analyticsAPI.junctionRisk(params),
      ])
      setTemporal(tRes.data)
      setVehicles(vRes.data)
      setViolations(vtRes.data)
      setStations(sRes.data)
      setOffenders(oRes.data)
      setHotspots(hRes.data)
      setJunctions(jRes.data)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  // Risk distribution for pie chart
  const riskDist = ['Critical', 'High', 'Moderate', 'Low'].map(cat => ({
    name: cat,
    value: junctions.filter(j => j.risk_category === cat).length,
    color: RISK_COLORS[cat],
  }))

  // Offender categories
  const offenderCats = ['Habitual', 'High', 'Medium', 'Low'].map(cat => ({
    name: cat,
    value: offenders.filter(o => o.risk_category === cat).length,
  }))

  const hotspotTypes = ['Emerging', 'Growing', 'Stable', 'Moderate'].map(t => ({
    name: t,
    value: hotspots.filter(h => h.hotspot_type === t).length,
  }))

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav title="Analytics" />
        <main className="flex-1 overflow-auto p-4 space-y-4">

          {/* Monthly Trend */}
          <Panel title="Monthly Violation Trend" sub="TEMPORAL ANALYTICS">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={temporal?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#00D4FF" radius={[4, 4, 0, 0]} name="Violations" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          {/* Row: Hourly + Daily */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Violations by Hour (IST)" sub="PEAK HOUR ANALYSIS">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={temporal?.hourly || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}:00`} tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Count" radius={[3, 3, 0, 0]}>
                    {temporal?.hourly?.map((_: any, i: number) => (
                      <Cell
                        key={i}
                        fill={
                          temporal.peak_hour === i ? '#EF4444' :
                          (i >= 7 && i <= 10) || (i >= 17 && i <= 20) ? '#F97316' :
                          '#00D4FF40'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {temporal?.peak_hour !== undefined && (
                <div className="mt-2 text-xs text-text-muted">
                  Peak hour: <span className="text-red-400 font-bold">{temporal.peak_hour}:00 IST</span>
                </div>
              )}
            </Panel>

            <Panel title="Violations by Day of Week" sub="WEEKLY PATTERN">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={temporal?.daily || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Violations" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Row: Vehicle types + Violation types */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Vehicle Type Distribution" sub="VEHICLE ANALYTICS">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={vehicles.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <YAxis dataKey="vehicle_type" type="category" tick={{ fill: '#9CA3AF', fontSize: 10 }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#F59E0B" radius={[0, 4, 4, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Top Violation Types" sub="VIOLATION BREAKDOWN">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={violations.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <YAxis dataKey="violation_type" type="category" tick={{ fill: '#9CA3AF', fontSize: 10 }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Row: Risk distribution + Hotspot types + Offender categories */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Junction Risk Distribution" sub="RISK SEGMENTATION">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={riskDist} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {riskDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {riskDist.map(r => (
                  <div key={r.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                    <span className="text-text-muted">{r.name}: </span>
                    <span className="text-text-primary font-mono">{r.value}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Hotspot Classification" sub="HOTSPOT DETECTION">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={hotspotTypes} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {hotspotTypes.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {hotspotTypes.map((h, i) => (
                  <div key={h.name} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-text-muted">{h.name}: </span>
                    <span className="text-text-primary font-mono">{h.value}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Repeat Offender Profiles" sub="OFFENDER INTELLIGENCE">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={offenderCats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                    {offenderCats.map((_, i) => (
                      <Cell key={i} fill={['#EF4444', '#F97316', '#F59E0B', '#22C55E'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Police Station Workload */}
          <Panel title="Police Station Workload Rankings" sub="STATION INTELLIGENCE">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stations.slice(0, 20).map((s, i) => (
                <div key={s.police_station} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-muted w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-primary truncate max-w-[200px]">{s.police_station}</span>
                      <span className="text-xs font-mono text-text-secondary ml-2">{s.total_violations.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${s.workload_score}%` }}
                      />
                    </div>
                  </div>
                  <span className={clsx(
                    'text-xs font-mono w-10 text-right',
                    s.monthly_growth_rate > 10 ? 'text-red-400' : s.monthly_growth_rate > 0 ? 'text-amber-400' : 'text-green-400'
                  )}>
                    {s.monthly_growth_rate > 0 ? '+' : ''}{s.monthly_growth_rate.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Top Repeat Offenders */}
          <Panel title="Top Repeat Offender Profiles" sub="OFFENDER INTELLIGENCE">
            <div className="overflow-x-auto">
              <table className="w-full cmd-table">
                <thead>
                  <tr>
                    <th className="text-left">#</th>
                    <th className="text-left">Vehicle (Anon.)</th>
                    <th className="text-left">Type</th>
                    <th className="text-right">Violations</th>
                    <th className="text-right">Junctions</th>
                    <th className="text-left">First Seen</th>
                    <th className="text-left">Last Seen</th>
                    <th className="text-center">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {offenders.slice(0, 20).map((o, i) => (
                    <tr key={o.vehicle_number}>
                      <td className="text-text-muted text-xs font-mono">{i + 1}</td>
                      <td className="font-mono text-xs text-primary">{o.vehicle_number}</td>
                      <td className="text-xs text-text-secondary">{o.vehicle_type}</td>
                      <td className="text-right font-mono text-xs font-bold">{o.violation_count}</td>
                      <td className="text-right font-mono text-xs">{o.unique_junctions}</td>
                      <td className="text-xs text-text-muted">{o.first_seen?.slice(0, 10)}</td>
                      <td className="text-xs text-text-muted">{o.last_seen?.slice(0, 10)}</td>
                      <td className="text-center">
                        <span className={clsx(
                          'px-2 py-0.5 rounded text-[10px] font-semibold border',
                          ({
                            Habitual: 'text-red-400 border-red-500/30 bg-red-500/10',
                            High: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
                            Medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
                            Low: 'text-green-400 border-green-500/30 bg-green-500/10',
                          } as Record<string, string>)[o.risk_category] || ''
                        )}>
                          {o.risk_category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

        </main>
      </div>
    </div>
  )
}
