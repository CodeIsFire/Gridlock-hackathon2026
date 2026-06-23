'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import KPIGrid from '@/components/cards/KPIGrid'
import JunctionRiskTable from '@/components/charts/JunctionRiskTable'
import InsightsFeed from '@/components/ai/InsightsFeed'
import { analyticsAPI } from '@/lib/api'
import { useStore } from '@/store'

// Leaflet must be client-only
const CommandMap = dynamic(() => import('@/components/map/CommandMap'), { ssr: false })

export default function CommandCenterPage() {
  const router = useRouter()
  const { filters, setSelectedJunction } = useStore()

  const [kpis, setKpis] = useState<any>(null)
  const [junctions, setJunctions] = useState<any[]>([])
  const [loadingKpis, setLoadingKpis] = useState(true)

  const loadData = useCallback(async () => {
    const params = filters as Record<string, string>
    try {
      setLoadingKpis(true)
      const [kRes, jRes] = await Promise.all([
        analyticsAPI.kpis(params),
        analyticsAPI.junctionRisk(params),
      ])
      setKpis(kRes.data)
      setJunctions(jRes.data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoadingKpis(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav title="Command Center" />

        <main className="flex-1 overflow-auto p-4 space-y-4">
          {/* KPI Row */}
          <KPIGrid data={kpis} />

          {/* Main grid: Map + Right panel */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>

            {/* Map — 2/3 width */}
            <div className="xl:col-span-2 glass rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-xs font-mono text-text-muted">GEOSPATIAL COMMAND CENTER</span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-primary font-mono">LIVE</span>
                </div>
              </div>
              <div style={{ height: 'calc(100% - 44px)' }}>
                <CommandMap />
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4 overflow-hidden">
              {/* Insights Feed */}
              <div className="glass rounded-xl border border-border p-4 flex-1 overflow-hidden">
                <InsightsFeed />
              </div>
            </div>
          </div>

          {/* Junction Risk Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl border border-border p-4"
            style={{ maxHeight: 480 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-mono text-text-muted">JUNCTION INTELLIGENCE ENGINE</div>
                <div className="text-sm font-display font-semibold mt-0.5">
                  Risk-Ranked Junction Index · {junctions.length} junctions
                </div>
              </div>
              <div className="flex items-center gap-3">
                {['Critical', 'High', 'Moderate', 'Low'].map(cat => {
                  const count = junctions.filter(j => j.risk_category === cat).length
                  const colors: Record<string, string> = {
                    Critical: 'text-red-400', High: 'text-orange-400',
                    Moderate: 'text-amber-400', Low: 'text-green-400'
                  }
                  return (
                    <div key={cat} className="text-center">
                      <div className={`text-base font-bold font-display ${colors[cat]}`}>{count}</div>
                      <div className="text-[10px] text-text-muted">{cat}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <JunctionRiskTable
              data={junctions}
              onSelect={(name) => setSelectedJunction(name)}
            />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
