'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileType, CheckCircle, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { adminAPI } from '@/lib/api'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    validateAndSetFile(droppedFile)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast.error('Only CSV files are supported')
      return
    }
    
    // 200MB limit
    if (selectedFile.size > 200 * 1024 * 1024) {
      toast.error('File size must be under 200MB')
      return
    }
    
    setFile(selectedFile)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const res = await adminAPI.upload(file)
      setResult(res.data)
      toast.success('Data ingested successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed')
      setResult(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav title="Data Upload" />
        <main className="flex-1 overflow-auto p-6 md:p-8 flex items-center justify-center">
          
          <div className="max-w-3xl w-full space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-display font-bold mb-2">Ingest New Data</h1>
              <p className="text-text-secondary text-sm">Upload a CSV file to replace the current dataset and run the ETL pipeline.</p>
            </div>

            {!result ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl border border-border p-8"
              >
                {/* Drag & Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300
                    ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-surface'}
                    ${uploading ? 'opacity-50 pointer-events-none' : ''}
                  `}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".csv"
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center gap-4">
                    <div className={`p-4 rounded-full ${isDragging ? 'bg-primary/20 text-primary' : 'bg-surface border border-border text-text-muted'}`}>
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-lg font-medium mb-1">
                        {file ? file.name : "Click to upload or drag and drop"}
                      </div>
                      <div className="text-sm text-text-muted">
                        {file ? `Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB` : "CSV up to 200MB"}
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {file && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 space-y-6 overflow-hidden"
                    >
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-red-400 mb-1">Warning: Destructive Action</h4>
                          <p className="text-xs text-text-secondary">
                            Uploading this file will permanently delete the current dataset and replace it with the new records. All cached analytics will be invalidated.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-void font-semibold transition-all hover:brightness-110 disabled:opacity-70"
                      >
                        {uploading ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Processing Data Pipeline...</span>
                          </>
                        ) : (
                          <>
                            <FileType className="w-5 h-5" />
                            <span>Start Ingestion</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* Success Results Panel */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl border border-primary/30 p-8 glow-primary relative overflow-hidden"
              >
                <div className="scan-effect" />
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4 border border-green-500/30">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-display font-bold">Ingestion Complete</h2>
                  <p className="text-text-secondary mt-2">The dataset has been successfully processed and loaded.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-surface border border-border">
                    <div className="text-xs text-text-muted mb-1">Rows Ingested</div>
                    <div className="text-2xl font-display font-bold text-primary">{result.clean_rows?.toLocaleString() || result.raw_rows?.toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface border border-border">
                    <div className="text-xs text-text-muted mb-1">Start Date</div>
                    <div className="text-lg font-display font-medium">{result.date_range?.min?.slice(0,10)}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface border border-border">
                    <div className="text-xs text-text-muted mb-1">End Date</div>
                    <div className="text-lg font-display font-medium">{result.date_range?.max?.slice(0,10)}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface border border-border">
                    <div className="text-xs text-text-muted mb-1">Data Quality</div>
                    <div className="text-lg font-display font-medium text-green-400">Optimal</div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/analytics')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium group"
                >
                  <span>View New Analytics</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}
