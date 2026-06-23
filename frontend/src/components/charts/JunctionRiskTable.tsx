'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Users, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const RISK_STYLES: Record<string, string> = {
  Critical: 'risk-bg-critical text-red-400 border',
  High: 'risk-bg-high text-orange-400 border',
  Moderate: 'risk-bg-moderate text-amber-400 border',
  Low: 'risk-bg-low text-green-400 border',
}

interface Props {
  data: any[]
  onSelect?: (junction: string) => void
}

type SortKey = 'risk_score' | 'total_violations' | 'growth_rate' | 'repeat_offender_count'

export default function JunctionRiskTable({ data, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('risk_score')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 15

  const sorted = [...(data || [])].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey]
    return sortAsc ? diff : -diff
  })

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil((data?.length || 0) / PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3 opacity-30" />

  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        No junction data available
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-auto flex-1">
        <table className="w-full cmd-table">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="text-left">#</th>
              <th className="text-left">Junction</th>
              <th className="text-left">Station</th>
              <th
                className="text-right cursor-pointer hover:text-primary select-none"
                onClick={() => handleSort('risk_score')}
              >
                <span className="flex items-center justify-end gap-1">
                  Risk Score <SortIcon col="risk_score" />
                </span>
              </th>
              <th className="text-center">Category</th>
              <th
                className="text-right cursor-pointer hover:text-primary select-none"
                onClick={() => handleSort('total_violations')}
              >
                <span className="flex items-center justify-end gap-1">
                  Violations <SortIcon col="total_violations" />
                </span>
              </th>
              <th
                className="text-right cursor-pointer hover:text-primary select-none"
                onClick={() => handleSort('repeat_offender_count')}
              >
                <span className="flex items-center justify-end gap-1">
                  Repeats <SortIcon col="repeat_offender_count" />
                </span>
              </th>
              <th
                className="text-right cursor-pointer hover:text-primary select-none"
                onClick={() => handleSort('growth_rate')}
              >
                <span className="flex items-center justify-end gap-1">
                  Growth <SortIcon col="growth_rate" />
                </span>
              </th>
              <th className="text-center">Deploy</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((j, idx) => (
              <motion.tr
                key={j.junction_name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="cursor-pointer"
                onClick={() => onSelect?.(j.junction_name)}
              >
                <td className="font-mono text-text-muted text-xs">
                  {page * PAGE_SIZE + idx + 1}
                </td>
                <td>
                  <div className="font-medium text-text-primary text-xs max-w-[180px] truncate">
                    {j.junction_name}
                  </div>
                </td>
                <td className="text-text-muted text-xs max-w-[120px] truncate">
                  {j.police_station}
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${j.risk_score}%`,
                          background: j.risk_score > 80 ? '#EF4444' : j.risk_score > 60 ? '#F97316' : j.risk_score > 30 ? '#F59E0B' : '#22C55E'
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs text-text-primary w-8 text-right">
                      {j.risk_score.toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="text-center">
                  <span className={clsx('px-2 py-0.5 rounded text-[10px] font-semibold', RISK_STYLES[j.risk_category])}>
                    {j.risk_category}
                  </span>
                </td>
                <td className="text-right font-mono text-xs">
                  {j.total_violations.toLocaleString()}
                </td>
                <td className="text-right">
                  <span className="flex items-center justify-end gap-1 text-xs text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    {j.repeat_offender_count}
                  </span>
                </td>
                <td className="text-right font-mono text-xs">
                  <span className={clsx(j.growth_rate > 10 ? 'text-red-400' : j.growth_rate > 0 ? 'text-amber-400' : 'text-green-400')}>
                    {j.growth_rate > 0 ? '+' : ''}{j.growth_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="text-center">
                  {j.deployment.officers > 0 ? (
                    <span className="flex items-center justify-center gap-1 text-xs text-primary">
                      <Users className="w-3 h-3" />
                      {j.deployment.officers}
                      {j.deployment.tow_vehicles > 0 && ' + 🚛'}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
          <span className="text-xs text-text-muted font-mono">
            {data.length} junctions · Page {page + 1}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-xs rounded border border-border disabled:opacity-30 hover:border-primary/40 transition-colors"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-xs rounded border border-border disabled:opacity-30 hover:border-primary/40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
