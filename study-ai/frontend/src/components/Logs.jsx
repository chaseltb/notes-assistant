import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../session.js'

export default function Logs() {
  const [text, setText] = useState('Loading...')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const bottomRef = useRef(null)

  async function fetchLogs() {
    try {
      const res = await apiFetch('/logs')
      const t = await res.text()
      setText(t)
    } catch (err) {
      setText('Failed to fetch logs: ' + err.message)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchLogs, 3000)
    return () => clearInterval(id)
  }, [autoRefresh])

  useEffect(() => {
    if (autoRefresh) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [text])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Logs</h2>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="accent-indigo-500"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
          >
            Refresh now
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(text)}
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-auto max-h-[70vh]">
        <pre className="p-4 text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
          {text}
        </pre>
        <div ref={bottomRef} />
      </div>

      <p className="text-xs text-gray-600">
        Last 300 lines kept in memory. Buffer resets on server restart.
      </p>
    </div>
  )
}
