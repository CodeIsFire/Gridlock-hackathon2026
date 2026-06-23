'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { useStore } from '@/store'
import { Save, Key, Map, Brain } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const router = useRouter()


  const [geminiKey, setGeminiKey] = useState('')
  const [mapKey, setMapKey] = useState('')

  useEffect(() => {

    // Load saved keys from localStorage (client-side only)
    setGeminiKey(localStorage.getItem('tcc_gemini_key') || '')
    setMapKey(localStorage.getItem('tcc_map_key') || '')
  }, [])

  const save = () => {
    localStorage.setItem('tcc_gemini_key', geminiKey)
    localStorage.setItem('tcc_map_key', mapKey)
    toast.success('Settings saved. Restart backend to apply API keys.')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav title="Settings" />
        <main className="flex-1 overflow-auto p-4 space-y-4 max-w-2xl">

          <div className="glass rounded-xl border border-border p-5">
            <div className="text-xs font-mono text-text-muted mb-1">API CONFIGURATION</div>
            <div className="text-sm font-display font-semibold mb-5">External Service Keys</div>
            <p className="text-xs text-text-muted mb-5">
              API keys are configured via environment variables in the backend (.env file).
              The values below are for reference. Set them in backend/.env and restart.
            </p>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-mono text-text-muted mb-2">
                  <Brain className="w-3.5 h-3.5 text-primary" />
                  GEMINI_API_KEY
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors font-mono"
                />
                <p className="text-xs text-text-muted mt-1">Required for AI Copilot and Report generation</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-mono text-text-muted mb-2">
                  <Map className="w-3.5 h-3.5 text-primary" />
                  MAPMYINDIA_API_KEY
                </label>
                <input
                  type="password"
                  value={mapKey}
                  onChange={e => setMapKey(e.target.value)}
                  placeholder="Your MapmyIndia key..."
                  className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors font-mono"
                />
                <p className="text-xs text-text-muted mt-1">Used for enhanced map tiles and geocoding</p>
              </div>

              <button
                onClick={save}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-void font-bold rounded-xl hover:bg-primary/90 transition-colors text-sm"
              >
                <Save className="w-4 h-4" />
                Save Settings
              </button>
            </div>
          </div>

          <div className="glass rounded-xl border border-border p-5">
            <div className="text-xs font-mono text-text-muted mb-3">ENVIRONMENT CONFIG</div>
            <pre className="text-xs font-mono text-text-secondary bg-surface rounded-lg p-4 overflow-x-auto">
{`# backend/.env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/traffic_cmd
REDIS_URL=redis://redis:6379/0
SECRET_KEY=your-long-random-secret-key
GEMINI_API_KEY=your_gemini_api_key
MAPMYINDIA_API_KEY=your_mapmyindia_key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:3000

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPMYINDIA_KEY=your_mapmyindia_key`}
            </pre>
          </div>

        </main>
      </div>
    </div>
  )
}
