'use client'
import { useStore } from '@/store'
import { Clock, Filter, X, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/api'

export default function TopNav({ title }: { title: string }) {
  const { filters, setFilter, clearFilters, filterOptions, setFilterOptions } = useStore()
  const [showFilters, setShowFilters] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!filterOptions) {
      adminAPI.filterOptions().then(r => setFilterOptions(r.data)).catch(() => {})
    }
  }, [])

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const istTime = now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const istDate = now.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <header className="h-[60px] glass border-b border-border flex items-center justify-between px-6 z-10 flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="font-display font-bold text-sm tracking-wide text-text-primary">{title}</h1>
        <div className="w-px h-4 bg-border" />
        <span className="text-xs text-text-muted font-mono">BENGALURU ITMS</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Live clock IST */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-xs text-text-secondary">{istDate} · {istTime} IST</span>
        </div>

        {/* Filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
            showFilters || activeFilterCount > 0
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-surface border-border text-text-secondary hover:border-primary/30'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-void text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-red-400 hover:border-red-500/30 transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Filter Drawer */}
      {showFilters && (
        <div className="absolute top-[60px] right-0 w-80 glass border-l border-b border-border p-4 z-30 rounded-bl-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-text-muted">ACTIVE FILTERS</span>
            <button onClick={() => setShowFilters(false)}>
              <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Police Station</label>
              <select
                value={filters.police_station || ''}
                onChange={(e) => setFilter('police_station', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary/50"
              >
                <option value="">All Stations</option>
                {filterOptions?.police_stations.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Vehicle Type</label>
              <select
                value={filters.vehicle_type || ''}
                onChange={(e) => setFilter('vehicle_type', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary/50"
              >
                <option value="">All Vehicles</option>
                {filterOptions?.vehicle_types.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Validation Status</label>
              <select
                value={filters.validation_status || ''}
                onChange={(e) => setFilter('validation_status', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary/50"
              >
                <option value="">All Records</option>
                {filterOptions?.validation_statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <button
              onClick={clearFilters}
              className="w-full py-2 rounded-lg border border-border text-xs text-text-muted hover:text-red-400 hover:border-red-500/30 transition-all"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
