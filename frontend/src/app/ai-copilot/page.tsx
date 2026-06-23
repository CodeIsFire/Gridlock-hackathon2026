'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { aiAPI } from '@/lib/api'
import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Brain, User, Loader, Lightbulb } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  role: 'user' | 'model'
  content: string
  timestamp: Date
}

const QUICK_PROMPTS = [
  'Which junctions need immediate enforcement action?',
  'What changed this week in violation patterns?',
  'Which hotspots are growing fastest?',
  'Generate deployment recommendations for today.',
  'Which police station has the highest workload?',
  'Summarize repeat offender trends.',
]

export default function AICopilotPage() {
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: `# Traffic Intelligence Analyst Ready

I have real-time access to Bengaluru's traffic violation data. Ask me about:

- **Junction risk levels** and which need urgent attention
- **Hotspot trends** — growing, emerging, or stable zones
- **Police station workloads** and enforcement gaps
- **Repeat offenders** and escalation candidates
- **Officer deployment** recommendations
- **Monthly / weekly summaries** and anomalies

What would you like to know?`,
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const res = await aiAPI.chat(apiMessages)
      setMessages(prev => [...prev, {
        role: 'model',
        content: res.data.response,
        timestamp: new Date(),
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Unable to connect to AI analyst. Please check the Gemini API configuration.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav title="AI Copilot" />

        <div className="flex-1 flex overflow-hidden">
          {/* Chat area */}
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-1">
                        <Brain className="w-4 h-4 text-primary" />
                      </div>
                    )}

                    <div className={`max-w-2xl rounded-xl p-4 text-sm ${
                      msg.role === 'user'
                        ? 'glass-light border border-border text-text-primary ml-12'
                        : 'glass border border-border/60'
                    }`}>
                      {msg.role === 'model' ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                      <div className="text-[10px] text-text-muted mt-2 font-mono">
                        {msg.timestamp.toLocaleTimeString('en-IN', {
                          timeZone: 'Asia/Kolkata', hour12: false
                        })} IST
                      </div>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-text-secondary" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="glass border border-border/60 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Loader className="w-3.5 h-3.5 animate-spin text-primary" />
                      Analysing traffic data...
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                  placeholder="Ask about junctions, hotspots, deployments..."
                  className="flex-1 px-4 py-3 rounded-xl bg-panel border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors text-text-primary placeholder:text-text-muted"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="px-4 py-3 rounded-xl bg-primary text-void font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick prompts sidebar */}
          <div className="w-64 flex-shrink-0 border-l border-border p-4 space-y-3 overflow-y-auto">
            <div className="text-xs font-mono text-text-muted">QUICK QUERIES</div>
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p)}
                disabled={loading}
                className="w-full text-left text-xs p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 text-text-secondary hover:text-text-primary transition-all leading-relaxed disabled:opacity-40"
              >
                <Lightbulb className="w-3 h-3 text-primary mb-1" />
                {p}
              </button>
            ))}

            <div className="pt-4 border-t border-border">
              <div className="text-xs font-mono text-text-muted mb-2">CONTEXT</div>
              <div className="text-xs text-text-muted space-y-1">
                <div className="flex justify-between">
                  <span>Data</span>
                  <span className="text-primary font-mono">Live</span>
                </div>
                <div className="flex justify-between">
                  <span>Model</span>
                  <span className="text-primary font-mono">Ollama Gemma4</span>
                </div>
                <div className="flex justify-between">
                  <span>Timezone</span>
                  <span className="text-primary font-mono">IST</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
