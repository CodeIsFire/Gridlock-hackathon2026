'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { adminAPI } from '@/lib/api'
import { useStore } from '@/store'
import { motion } from 'framer-motion'
import { Database, RefreshCw, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [ingesting, setIngesting] = useState(false)

  useEffect(() => {

    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, hRes] = await Promise.all([
        adminAPI.profile(),
        adminAPI.health(),
      ])
      setProfile(pRes.data)
      setHealth(hRes.data)
    } catch {}
    finally { setLoading(false) }
  }

  const triggerIngest = async () => {
    setIngesting(true)
    try {
      const res = await adminAPI.ingest(true)
      toast.success(`Ingestion: ${res.data.status}`)
      await load()
    } catch {
      toast.error('Ingestion failed')
    } finally {
      setIngesting(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav title="Administration" />
        <main className="flex-1 overflow-auto p-4 space-y-4">

          {/* System Health */}
          <div className="glass rounded-xl border border-border p-5">
            <div className="text-xs font-mono text-text-muted mb-1">SYSTEM STATUS</div>
            <div className="text-sm font-display font-semibold mb-4">Service Health</div>
            <div className="flex items-center gap-3">
              {health ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Backend operational · {health.service}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Backend unreachable</span>
                </div>
              )}
            </div>
          </div>

          {/* Data Profile */}
          {loading ? (
            <div className="glass rounded-xl border border-border p-5 animate-pulse h-40" />
          ) : profile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-xl border border-border p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-mono text-text-muted mb-1">DATA PROFILE</div>
                  <div className="text-sm font-display font-semibold">Dataset Statistics</div>
                </div>
                <button
                  onClick={triggerIngest}
                  disabled={ingesting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/30 text-xs transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin text-primary' : 'text-text-muted'}`} />
                  Re-ingest Data
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Total Violations', value: profile.total_violations?.toLocaleString() },
                  { label: 'Police Stations', value: profile.police_stations },
                  { label: 'Named Junctions', value: profile.junctions_named },
                  { label: 'Unique Vehicles', value: profile.unique_vehicles?.toLocaleString() },
                ].map(s => (
                  <div key={s.label} className="p-4 rounded-xl bg-surface border border-border">
                    <div className="font-display text-2xl font-bold">{s.value || '—'}</div>
                    <div className="text-xs text-text-muted mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-text-muted mb-3">
                <span className="font-mono">DATE RANGE: </span>
                {profile.date_range?.min?.slice(0, 10)} → {profile.date_range?.max?.slice(0, 10)}
              </div>

              {/* Vehicle distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-mono text-text-muted mb-3">TOP VEHICLE TYPES</div>
                  <div className="space-y-2">
                    {profile.vehicle_type_distribution?.map((v: any) => {
                      const max = profile.vehicle_type_distribution[0].count
                      return (
                        <div key={v.type} className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary w-28 truncate">{v.type}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(v.count / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-text-muted w-14 text-right">
                            {v.count.toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-mono text-text-muted mb-3">TOP STATIONS BY VIOLATIONS</div>
                  <div className="space-y-2">
                    {profile.top_stations?.map((s: any) => {
                      const max = profile.top_stations[0].count
                      return (
                        <div key={s.station} className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary w-36 truncate">{s.station}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-amber-400"
                              style={{ width: `${(s.count / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-text-muted w-14 text-right">
                            {s.count.toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Data quality notes */}
          <div className="glass rounded-xl border border-border p-5">
            <div className="text-xs font-mono text-text-muted mb-3">DATA QUALITY NOTES</div>
            <div className="space-y-2 text-xs text-text-secondary">
              {[
                '✓ UTC timestamps converted to IST (Asia/Kolkata, +5:30)',
                '✓ violation_type JSON arrays parsed and normalized',
                '✓ Null-only columns (description, closed_datetime, action_taken_timestamp) dropped',
                '✓ H3 hex zones assigned at resolution 9 for "No Junction" records',
                '⚠ 49.6% of records have junction_name = "No Junction" — H3 clustering applied',
                '⚠ 41.97% of records have no validation_status — included in all-records view',
                '⚠ Vehicle numbers are anonymized (FKN format) — relative frequency preserved',
              ].map((note, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0">{note.startsWith('✓') ? '✓' : '⚠'}</span>
                  <span>{note.slice(2)}</span>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
