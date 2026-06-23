import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 180000,
})


// ── Analytics ─────────────────────────────────────────────────────
export const analyticsAPI = {
  kpis: (params?: Record<string, string>) =>
    api.get('/api/analytics/kpis', { params }),

  junctionRisk: (params?: Record<string, string>) =>
    api.get('/api/analytics/junctions/risk', { params }),

  junctionDetail: (name: string) =>
    api.get(`/api/analytics/junctions/${encodeURIComponent(name)}/detail`),

  stations: (params?: Record<string, string>) =>
    api.get('/api/analytics/stations', { params }),

  offenders: (params?: Record<string, string>) =>
    api.get('/api/analytics/offenders', { params }),

  temporal: (params?: Record<string, string>) =>
    api.get('/api/analytics/temporal', { params }),

  heatmap: (params?: Record<string, string>) =>
    api.get('/api/analytics/heatmap', { params }),

  hotspots: (params?: Record<string, string>) =>
    api.get('/api/analytics/hotspots', { params }),

  vehicles: (params?: Record<string, string>) =>
    api.get('/api/analytics/vehicles', { params }),

  violationTypes: (params?: Record<string, string>) =>
    api.get('/api/analytics/violations/types', { params }),

  whatif: (scenario: Record<string, number>) =>
    api.post('/api/analytics/whatif', scenario),
}

// ── AI ────────────────────────────────────────────────────────────
export const aiAPI = {
  chat: (messages: Array<{role: string; content: string}>) =>
    api.post('/api/ai/chat', { messages }),

  report: (type: 'daily' | 'weekly' | 'monthly' | 'executive') =>
    api.get(`/api/ai/report/${type}`),

  insights: () => api.get('/api/ai/insights'),

  whatifNarrative: (result: object) =>
    api.post('/api/ai/whatif/narrative', result),
}

// ── Admin ─────────────────────────────────────────────────────────
export const adminAPI = {
  profile: () => api.get('/api/admin/profile'),
  filterOptions: () => api.get('/api/admin/filters/options'),
  ingest: (force?: boolean) => api.post('/api/admin/ingest', null, { params: { force } }),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes for large files
    })
  },
  health: () => api.get('/api/health'),
}

