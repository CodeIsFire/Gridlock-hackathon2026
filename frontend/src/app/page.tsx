'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  MapPin, AlertTriangle, Users, TrendingUp,
  Shield, Brain, Zap, ChevronRight, Activity,
  Eye, BarChart3, Radio
} from 'lucide-react'

const stats = [
  { label: 'Violations Processed', value: '298,450', icon: Activity },
  { label: 'Junctions Monitored', value: '168', icon: MapPin },
  { label: 'Police Stations', value: '54', icon: Shield },
  { label: 'Repeat Offenders', value: '35,587', icon: AlertTriangle },
  { label: 'High-Risk Zones', value: '47', icon: Eye },
]

const features = [
  {
    icon: MapPin,
    title: 'Geospatial Intelligence',
    desc: 'Live heatmaps, junction risk overlays, and H3 hexagonal hotspot grids across Bengaluru.',
  },
  {
    icon: AlertTriangle,
    title: 'Hotspot Detection',
    desc: 'Automatic identification of emerging, growing, and critical enforcement zones using temporal clustering.',
  },
  {
    icon: Users,
    title: 'Repeat Offender Analysis',
    desc: 'Habitual, High, Medium, and Low risk profiles built from historical violation patterns.',
  },
  {
    icon: Zap,
    title: 'Officer Allocation',
    desc: 'AI-generated deployment plans: officers and tow vehicles assigned by junction risk scores.',
  },
  {
    icon: BarChart3,
    title: 'Risk Scoring Engine',
    desc: 'Multi-factor junction risk index: violation density, peak load, repeat rates, and growth.',
  },
  {
    icon: Brain,
    title: 'AI Traffic Analyst',
    desc: 'Gemma4-powered copilot that reads live data and answers enforcement questions in plain English.',
  },
]

const architecture = [
  { label: 'Traffic Violations Dataset', sub: '298K+ records · Nov 2023–Apr 2024', color: 'from-blue-500/20 to-blue-600/10' },
  { label: 'Analytics Engine', sub: 'Pandas · NumPy · Scikit-Learn · PostgreSQL', color: 'from-cyan-500/20 to-cyan-600/10' },
  { label: 'AI Intelligence Layer', sub: 'Ollama Gemma4 (Local LLM)', color: 'from-violet-500/20 to-violet-600/10' },
  { label: 'Decision Support System', sub: 'Command Center · Deployment Optimizer · Reports', color: 'from-primary/20 to-primary/5' },
]

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-void overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 glass border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-semibold text-sm tracking-wide">
            TRAFFIC COMMAND CENTER
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/command-center')}
            className="px-4 py-2 text-sm bg-primary text-void font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Launch Dashboard
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-8 overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono tracking-widest mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              BENGALURU ITMS · LIVE ANALYTICS
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
              AI-Powered{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-300 text-glow">
                Traffic Intelligence
              </span>{' '}
              Platform
            </h1>

            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              Transform traffic violations into actionable enforcement intelligence.
              Built for Bengaluru's Traffic Control Centre.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/command-center')}
                className="flex items-center gap-2 px-8 py-4 bg-primary text-void font-display font-semibold rounded-xl text-base hover:bg-primary/90 transition-colors glow-primary"
              >
                Launch Command Center
                <ChevronRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/analytics')}
                className="flex items-center gap-2 px-8 py-4 border border-border bg-panel rounded-xl text-base font-display hover:border-primary/40 transition-colors"
              >
                Explore Analytics
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-8 border-y border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="font-display text-2xl font-bold text-text-primary">{stat.value}</div>
              <div className="text-xs text-text-muted mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-3">Intelligence Modules</h2>
            <p className="text-text-secondary">Six integrated systems that transform raw violations into enforcement decisions.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-xl border border-border bg-panel hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feat.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-2">{feat.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-20 px-8 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-3">System Architecture</h2>
            <p className="text-text-secondary">Data flows from raw violations to actionable decisions in milliseconds.</p>
          </div>
          <div className="space-y-3">
            {architecture.map((layer, i) => (
              <motion.div
                key={layer.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className={`relative p-5 rounded-xl border border-border/60 bg-gradient-to-r ${layer.color}`}
              >
                <div className="font-display font-semibold">{layer.label}</div>
                <div className="text-xs text-text-muted mt-1 font-mono">{layer.sub}</div>
                {i < architecture.length - 1 && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-primary z-10">↓</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 border-t border-border text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl font-bold mb-4">Ready to take command?</h2>
          <p className="text-text-secondary mb-8">
            Launch the Traffic Command Center to access the full platform.
          </p>
          <button
            onClick={() => router.push('/command-center')}
            className="px-10 py-4 bg-primary text-void font-display font-bold rounded-xl hover:bg-primary/90 transition-colors text-base glow-primary"
          >
            Launch Command Center
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-6 text-center">
        <p className="text-xs text-text-muted font-mono">
          TRAFFIC COMMAND CENTER AI · BENGALURU INTELLIGENT TRAFFIC MANAGEMENT SYSTEM
        </p>
      </footer>
    </div>
  )
}
