import { useState, useEffect, useRef } from 'react'
import { apiFetch, getSessionId } from '../session.js'

export default function Dashboard() {
  const [health, setHealth] = useState(null)
  const [documents, setDocuments] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [lastSync, setLastSync] = useState(() => localStorage.getItem('lastSync') || null)
  const [error, setError] = useState(null)
  const [sessionId] = useState(() => getSessionId())

  // Upload state
  const [dragOver, setDragOver] = useState(false)
  const [uploadCourse, setUploadCourse] = useState('General')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const [healthRes, docsRes] = await Promise.all([
        apiFetch('/health'),
        apiFetch('/documents'),
      ])
      const healthData = await healthRes.json()
      const docsData = await docsRes.json()
      setHealth(healthData)
      setDocuments(docsData.documents || [])
    } catch (e) {
      setError('Could not reach backend. Is it running?')
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setError(null)
    try {
      const res = await apiFetch('/sync', { method: 'POST' })
      const data = await res.json()
      setSyncResult(data)
      const now = new Date().toLocaleString()
      setLastSync(now)
      localStorage.setItem('lastSync', now)
      await fetchStats()
    } catch (e) {
      setError('Sync failed: ' + e.message)
    } finally {
      setSyncing(false)
    }
  }

  async function handleUploadFiles(files) {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadResult(null)
    setUploadError(null)

    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    formData.append('course', uploadCourse.trim() || 'General')

    try {
      const res = await apiFetch('/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Server error ${res.status}: ${text}`)
      }
      const data = await res.json()
      setUploadResult(data)
      await fetchStats()
    } catch (e) {
      setUploadError('Upload failed: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  function onDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function onDragLeave(e) {
    e.preventDefault()
    setDragOver(false)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleUploadFiles(Array.from(e.dataTransfer.files))
  }

  function onFileInputChange(e) {
    handleUploadFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const courses = [...new Set(documents.map(d => d.course))].filter(Boolean)

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          {lastSync && <p className="text-sm text-gray-400 mt-1">Last sync: {lastSync}</p>}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {syncing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Syncing...
            </>
          ) : 'Sync Notes'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>
      )}

      {syncResult && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-sm text-green-300">
          Sync complete — {syncResult.updated?.length ?? 0} updated, {syncResult.removed?.length ?? 0} removed,{' '}
          {syncResult.documents} total documents.
          {syncResult.updated?.length > 0 && (
            <div className="mt-1 text-green-400">Updated: {syncResult.updated.join(', ')}</div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-3xl font-bold text-indigo-400">{health?.indexed_documents ?? '—'}</div>
          <div className="text-sm text-gray-400 mt-1">Indexed Documents</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-3xl font-bold text-indigo-400">{health?.courses ?? (courses.length || '—')}</div>
          <div className="text-sm text-gray-400 mt-1">Courses</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-3xl font-bold text-indigo-400">{health?.indexed_chunks ?? '—'}</div>
          <div className="text-sm text-gray-400 mt-1">Chunks</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-sm font-bold text-indigo-400 leading-snug">{lastSync ?? '—'}</div>
          <div className="text-sm text-gray-400 mt-1">Last Sync</div>
        </div>
      </div>

      {/* Upload area */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-200">Upload Notes</h3>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400 whitespace-nowrap">Course name</label>
          <input
            type="text"
            value={uploadCourse}
            onChange={e => setUploadCourse(e.target.value)}
            placeholder="General"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-indigo-400 bg-indigo-900/20' : 'border-gray-700 hover:border-gray-500'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Uploading and indexing...
            </div>
          ) : (
            <>
              <svg className="mx-auto h-10 w-10 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
              </svg>
              <p className="text-sm text-gray-400">
                Drop PDFs, DOCX, PPTX, MD, or TXT files here — or click to browse
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,.md,.txt"
          className="hidden"
          onChange={onFileInputChange}
        />

        {uploadResult && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-sm text-green-300 space-y-3">
            <div>
              Indexed {uploadResult.saved?.length ?? 0} file{uploadResult.saved?.length !== 1 ? 's' : ''} successfully.
            </div>
            {uploadResult.detected?.map((d, i) => (
              <div key={i} className="bg-gray-900/60 rounded-lg p-3 space-y-1">
                <div className="font-semibold text-white">{d.title || d.filename}</div>
                {d.subject && <div className="text-xs text-indigo-400">{d.subject}</div>}
                {d.summary && <div className="text-xs text-gray-400">{d.summary}</div>}
                {d.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {d.topics.map((t, j) => (
                      <span key={j} className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {uploadError && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-sm text-red-300">{uploadError}</div>
        )}
      </div>

      {/* Documents table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold mb-4 text-gray-200">Documents</h3>
        {documents.length === 0 ? (
          <p className="text-gray-500 text-sm">No documents indexed yet. Click "Sync Notes" or upload files to get started.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-200">{doc.name}</div>
                  <div className="text-xs text-gray-500">{doc.course}</div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">{doc.chunk_count} chunks</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session info */}
      <p className="text-xs text-gray-600 text-center">
        Session: {sessionId} — bookmark this page to keep your notes
      </p>
    </div>
  )
}
