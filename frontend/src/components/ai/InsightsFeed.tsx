'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiAPI } from '@/lib/api'
import { AlertTriangle, TrendingUp, MapPin, Users, Clock, Zap, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const TYPE_ICONS: Record<string, React.ElementType> = {
  hotspot: MapPin,
  trend: TrendingUp,
  offender: Users,
  station: AlertTriangle,
  temporal: Clock,
  enforcement: Zap,
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-red-500/30 bg-red-500/5 text-red-400',
  warning: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  info: 'border-primary/20 bg-primary/5 text-primary',
}

interface FeedItem {
  type: string
  severity: string
  message: string
}

export default function InsightsFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await aiAPI.insights()
      setItems(res.data)
      setLastUpdated(new Date())
    } catch {
      setItems([
        { type: 'info', severity: 'info', message: 'AI insights unavailable. Check Gemini API key configuration.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-mono text-text-muted">AI INTELLIGENCE FEED</div>
          {lastUpdated && (
            <div className="text-[10px] text-text-muted opacity-60">
              Updated {lastUpdated.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })} IST
            </div>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg border border-border hover:border-primary/30 text-text-muted hover:text-primary transition-all"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-surface animate-pulse border border-border" />
          ))
        ) : (
          <AnimatePresence>
            {items.map((item, i) => {
              const Icon = TYPE_ICONS[item.type] || Zap
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={clsx(
                    'flex items-start gap-3 p-3 rounded-lg border text-xs',
                    SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.info
                  )}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span className="text-text-secondary leading-relaxed">{item.message}</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
