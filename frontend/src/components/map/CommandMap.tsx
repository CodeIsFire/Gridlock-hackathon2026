'use client'
import { useEffect, useRef, useState } from 'react'
import { analyticsAPI } from '@/lib/api'
import { useStore } from '@/store'
import { X, MapPin, AlertTriangle, Users, TrendingUp, Clock } from 'lucide-react'
import clsx from 'clsx'

const RISK_COLORS: Record<string, string> = {
  Critical: '#EF4444',
  High: '#F97316',
  Moderate: '#F59E0B',
  Low: '#22C55E',
}

export default function CommandMap() {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const heatLayerRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const { filters, mapLayer, setMapLayer, selectedJunction, setSelectedJunction } = useStore()
  const [junctionData, setJunctionData] = useState<any>(null)
  const [junctionDetail, setJunctionDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      // @ts-expect-error missing types for css
      await import('leaflet/dist/leaflet.css')

      if (mapRef.current) return

      const map = L.map(containerRef.current!, {
        center: [12.9716, 77.5946],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      })

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      mapRef.current = map
      loadLayers(map, L)
    }

    initMap()
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    const L = window.L
    if (L) loadLayers(mapRef.current, L)
  }, [filters, mapLayer])

  const loadLayers = async (map: any, L: any) => {
    setLoading(true)
    try {
      // Clear existing
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      if (heatLayerRef.current) {
        heatLayerRef.current.remove()
        heatLayerRef.current = null
      }

      const params = filters as Record<string, string>

      if (mapLayer === 'heatmap') {
        const heatData = await analyticsAPI.heatmap({ ...params, precision: '3' })
        const points = heatData.data.map((p: any) => [p.lat, p.lon, Math.min(p.weight / 50, 1)])

        // Dynamic import of leaflet.heat
        if (!(L as any).heatLayer) {
          // @ts-expect-error missing types for heat
          await import('leaflet.heat')
        }
        const heat = (L as any).heatLayer(points, {
          radius: 20,
          blur: 15,
          maxZoom: 17,
          gradient: { 0.2: '#22C55E', 0.5: '#F59E0B', 0.8: '#F97316', 1.0: '#EF4444' },
        }).addTo(map)
        heatLayerRef.current = heat
      }

      // Junction markers
      const junctions = await analyticsAPI.junctionRisk(params)
      setJunctionData(junctions.data)

      junctions.data.slice(0, 50).forEach((j: any) => {
        if (!j.latitude || !j.longitude) return

        const color = RISK_COLORS[j.risk_category] || '#22C55E'
        const size = j.risk_category === 'Critical' ? 16 : j.risk_category === 'High' ? 12 : 10

        const icon = L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            border-radius:50%;
            background:${color};
            border:2px solid rgba(255,255,255,0.3);
            box-shadow:0 0 ${j.risk_category === 'Critical' ? '12px' : '6px'} ${color}80;
            cursor:pointer;
          "></div>`,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        const marker = L.marker([j.latitude, j.longitude], { icon })
          .addTo(map)
          .on('click', () => {
            setSelectedJunction(j.junction_name)
            loadJunctionDetail(j.junction_name)
          })

        markersRef.current.push(marker)
      })
    } catch (err) {
      console.error('Map layer load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadJunctionDetail = async (name: string) => {
    try {
      const res = await analyticsAPI.junctionDetail(name)
      setJunctionDetail(res.data)
    } catch {}
  }

  const riskColor = RISK_COLORS[junctionDetail?.risk_category] || '#22C55E'

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border">
      {/* Map */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading map data...
          </div>
        </div>
      )}

      {/* Layer toggle */}
      <div className="absolute top-3 left-3 flex gap-2 z-[1000]">
        {(['heatmap', 'markers'] as const).map(layer => (
          <button
            key={layer}
            onClick={() => setMapLayer(layer)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
              mapLayer === layer
                ? 'bg-primary/20 border-primary/40 text-primary'
                : 'bg-void/80 border-border text-text-muted hover:text-text-secondary'
            )}
          >
            {layer.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 glass rounded-lg p-3 z-[1000]">
        <div className="text-xs text-text-muted font-mono mb-2">RISK LEVEL</div>
        {Object.entries(RISK_COLORS).reverse().map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-2 text-xs mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-text-secondary">{cat}</span>
          </div>
        ))}
      </div>

      {/* Junction Intelligence Panel */}
      {selectedJunction && (
        <div className="absolute top-3 right-3 w-72 glass rounded-xl border border-border p-4 z-[1000] max-h-[80%] overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 pr-2">
              <div className="text-xs font-mono text-text-muted mb-1">JUNCTION INTELLIGENCE</div>
              <h3 className="font-display font-bold text-sm leading-tight">{selectedJunction}</h3>
            </div>
            <button
              onClick={() => { setSelectedJunction(null); setJunctionDetail(null) }}
              className="text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {junctionDetail ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-surface border border-border text-center">
                  <div className="font-display font-bold text-base">{junctionDetail.total_violations?.toLocaleString()}</div>
                  <div className="text-xs text-text-muted">Violations</div>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border text-center">
                  <div className="font-display font-bold text-base" style={{ color: riskColor }}>
                    {junctionDetail.risk_score?.toFixed(0) || '—'}
                  </div>
                  <div className="text-xs text-text-muted">Risk Score</div>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-surface border border-border">
                <div className="text-xs text-text-muted mb-1">Top Violation</div>
                <div className="text-xs text-text-primary font-medium">{junctionDetail.top_violation}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Peak: {junctionDetail.peak_hour}:00 IST
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {junctionDetail.police_station}
                </div>
              </div>

              {junctionDetail.monthly_trend?.length > 0 && (
                <div>
                  <div className="text-xs text-text-muted mb-2">Monthly Trend</div>
                  <div className="flex items-end gap-1 h-12">
                    {junctionDetail.monthly_trend.map((m: any) => {
                      const max = Math.max(...junctionDetail.monthly_trend.map((x: any) => x.count))
                      const pct = (m.count / max) * 100
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-primary/40 rounded-t"
                            style={{ height: `${pct}%` }}
                          />
                          <div className="text-[8px] text-text-muted">{m.month.slice(5)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-text-muted">Loading intelligence data...</div>
          )}
        </div>
      )}
    </div>
  )
}
