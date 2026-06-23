'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { aiAPI, analyticsAPI } from '@/lib/api'
import { useStore } from '@/store'
import { motion } from 'framer-motion'
import {
  FileText, Download, Loader, Zap, TrendingDown,
  Users, Truck, AlertTriangle, BarChart3
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const REPORT_TYPES = [
  { id: 'daily', label: 'Daily Report', icon: FileText, desc: 'Today\'s enforcement priorities and key statistics' },
  { id: 'weekly', label: 'Weekly Report', icon: BarChart3, desc: 'Week-over-week trends and station performance' },
  { id: 'monthly', label: 'Monthly Report', icon: FileText, desc: 'Full monthly analytics and policy recommendations' },
  { id: 'executive', label: 'Executive Briefing', icon: Zap, desc: 'Senior official summary — key numbers and 3 actions' },
]

const WHATIF_SCENARIOS = [
  { key: 'increase_officers', label: 'Increase Officers', icon: Users, color: 'text-primary' },
  { key: 'increase_tow_vehicles', label: 'Add Tow Vehicles', icon: Truck, color: 'text-amber-400' },
  { key: 'reduce_illegal_parking', label: 'Reduce Illegal Parking', icon: AlertTriangle, color: 'text-orange-400' },
  { key: 'increase_enforcement', label: 'Increase Enforcement', icon: Zap, color: 'text-red-400' },
]

export default function ReportingPage() {
  const router = useRouter()

  const [activeReport, setActiveReport] = useState<string | null>(null)
  const [reportContent, setReportContent] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  // What-If
  const [scenario, setScenario] = useState<Record<string, number>>({})
  const [simResult, setSimResult] = useState<any>(null)
  const [simNarrative, setSimNarrative] = useState<string | null>(null)
  const [simLoading, setSimLoading] = useState(false)

  const generateReport = async (type: string) => {
    setActiveReport(type)
    setReportContent(null)
    setReportLoading(true)
    try {
      const res = await aiAPI.report(type as any)
      setReportContent(res.data.content)
    } catch {
      toast.error('Failed to generate report. Check Ollama connection.')
    } finally {
      setReportLoading(false)
    }
  }

  const downloadReport = () => {
    if (!reportContent) return
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tcc-${activeReport}-report-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded')
  }

  const runSimulation = async () => {
    if (!Object.keys(scenario).length) {
      toast.error('Set at least one scenario parameter')
      return
    }
    setSimLoading(true)
    setSimResult(null)
    setSimNarrative(null)
    try {
      // Run simulation first
      const simRes = await analyticsAPI.whatif(scenario)
      setSimResult(simRes.data)
      // Then send the actual simulation result to the AI narrative endpoint
      try {
        const narRes = await aiAPI.whatifNarrative(simRes.data)
        setSimNarrative(narRes.data.narrative)
      } catch {
        // Narrative is optional — simulation results still show
        setSimNarrative('AI narrative unavailable. Ollama may be processing.')
      }
    } catch {
      toast.error('Simulation failed')
    } finally {
      setSimLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav title="Reports & Simulation" />
        <main className="flex-1 overflow-auto p-4 space-y-4">

          {/* Report Generator */}
          <div className="glass rounded-xl border border-border p-5">
            <div className="text-xs font-mono text-text-muted mb-1">AI SITUATION REPORTS</div>
            <div className="text-sm font-display font-semibold mb-4">One-Click AI Report Generation</div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {REPORT_TYPES.map(rt => (
                <button
                  key={rt.id}
                  onClick={() => generateReport(rt.id)}
                  disabled={reportLoading}
                  className={clsx(
                    'p-4 rounded-xl border text-left transition-all disabled:opacity-50',
                    activeReport === rt.id
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-border hover:border-primary/30 hover:bg-panel'
                  )}
                >
                  <rt.icon className={clsx('w-4 h-4 mb-2', activeReport === rt.id ? 'text-primary' : 'text-text-muted')} />
                  <div className="text-xs font-semibold text-text-primary">{rt.label}</div>
                  <div className="text-xs text-text-muted mt-1">{rt.desc}</div>
                </button>
              ))}
            </div>

            {/* Report content */}
            {reportLoading && (
              <div className="flex items-center gap-3 p-6 rounded-xl bg-surface border border-border">
                <Loader className="w-4 h-4 text-primary animate-spin" />
                <span className="text-sm text-text-secondary">AI is generating your report...</span>
              </div>
            )}

            {reportContent && !reportLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-mono text-primary">{activeReport?.toUpperCase()} REPORT GENERATED</span>
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-primary/30 text-xs text-text-secondary hover:text-primary transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .md
                  </button>
                </div>
                <div className="p-5 rounded-xl bg-surface border border-border prose prose-invert prose-sm max-w-none max-h-[400px] overflow-y-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportContent}</ReactMarkdown>
                </div>
              </motion.div>
            )}
          </div>

          {/* What-If Simulator */}
          <div className="glass rounded-xl border border-border p-5">
            <div className="text-xs font-mono text-text-muted mb-1">WHAT-IF SIMULATOR</div>
            <div className="text-sm font-display font-semibold mb-1">Enforcement Scenario Modelling</div>
            <div className="text-xs text-text-muted mb-5">Adjust intervention parameters to project violation reduction impact.</div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {WHATIF_SCENARIOS.map(s => (
                <div key={s.key} className="p-4 rounded-xl border border-border bg-surface">
                  <div className="flex items-center gap-2 mb-3">
                    <s.icon className={clsx('w-4 h-4', s.color)} />
                    <span className="text-xs font-semibold">{s.label}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={scenario[s.key] || 0}
                    onChange={(e) => setScenario(prev => ({ ...prev, [s.key]: +e.target.value }))}
                    className="w-full accent-primary"
                  />
                  <div className="text-right text-xs font-mono text-primary mt-1">
                    {scenario[s.key] || 0}%
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={runSimulation}
              disabled={simLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-void font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
            >
              {simLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Run Simulation
            </button>

            {simResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 space-y-4"
              >
                {/* Before/After */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-surface">
                    <div className="text-xs font-mono text-text-muted mb-2">BASELINE</div>
                    <div className="font-display text-2xl font-bold">
                      {simResult.baseline.total_violations.toLocaleString()}
                    </div>
                    <div className="text-xs text-text-muted">total violations</div>
                    <div className="mt-2 font-display text-lg font-semibold text-orange-400">
                      {simResult.baseline.high_risk_junctions}
                    </div>
                    <div className="text-xs text-text-muted">high-risk junctions</div>
                  </div>

                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="text-xs font-mono text-primary mb-2">PROJECTED</div>
                    <div className="font-display text-2xl font-bold text-green-400">
                      {simResult.projected.total_violations.toLocaleString()}
                    </div>
                    <div className="text-xs text-text-muted">total violations</div>
                    <div className="mt-2 font-display text-lg font-semibold text-green-400">
                      {simResult.projected.high_risk_junctions}
                    </div>
                    <div className="text-xs text-text-muted">high-risk junctions</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 flex items-center gap-3">
                  <TrendingDown className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <div>
                    <div className="text-green-400 font-display font-bold text-lg">
                      -{simResult.projected.violation_reduction_pct}% violation reduction
                    </div>
                    <div className="text-xs text-text-muted">estimated impact from applied interventions</div>
                  </div>
                </div>

                {simNarrative && (
                  <div className="p-4 rounded-xl border border-border bg-surface">
                    <div className="text-xs font-mono text-text-muted mb-2">AI ASSESSMENT</div>
                    <p className="text-sm text-text-secondary leading-relaxed">{simNarrative}</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
