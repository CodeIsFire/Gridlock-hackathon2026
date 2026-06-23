'use client'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio, LayoutDashboard, MapPin, BarChart3,
  Brain, FileText, Settings, Users,
  ChevronLeft, Shield, Upload
} from 'lucide-react'
import { useStore } from '@/store'
import clsx from 'clsx'

const navItems = [
  { id: 'command-center', label: 'Command Center', icon: LayoutDashboard, href: '/command-center' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { id: 'ai-copilot', label: 'AI Copilot', icon: Brain, href: '/ai-copilot' },
  { id: 'reporting', label: 'Reports', icon: FileText, href: '/reporting' },
  { id: 'admin', label: 'Administration', icon: Shield, href: '/admin' },
  { id: 'upload', label: 'Upload Data', icon: Upload, href: '/admin/upload' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useStore()



  return (
    <AnimatePresence>
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 64 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="relative flex flex-col h-screen glass border-r border-border z-20 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border min-h-[60px]">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="font-display font-bold text-xs leading-tight">TRAFFIC COMMAND</div>
              <div className="font-mono text-[10px] text-primary">● SYSTEM ACTIVE</div>
            </motion.div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group',
                  active
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-text-secondary hover:bg-panel hover:text-text-primary'
                )}
              >
                <item.icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-primary' : '')} />
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-border p-3 space-y-2">

          <button
            onClick={toggleSidebar}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-panel transition-all text-sm"
          >
            <ChevronLeft className={clsx('w-4 h-4 flex-shrink-0 transition-transform', !sidebarOpen && 'rotate-180')} />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
