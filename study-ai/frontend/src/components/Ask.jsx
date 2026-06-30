import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '../session.js'

function SourceCard({ source }) {
  return (
    <div className="inline-flex flex-col text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 mr-2 mb-1">
      <span className="font-medium text-indigo-300">{source.document}</span>
      <span className="text-gray-400">p.{source.page} · {source.heading || 'No heading'}</span>
    </div>
  )
}

function Message({ msg }) {
  const [showExcerpts, setShowExcerpts] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="bg-indigo-700 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-xl text-sm">
          {msg.question}
        </div>
      </div>
      <div className="flex justify-start">
        <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-2xl space-y-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.answer}</p>
          {msg.sources?.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Sources</div>
              <div className="flex flex-wrap">
                {msg.sources.map((s, i) => <SourceCard key={i} source={s} />)}
              </div>
            </div>
          )}
          {msg.excerpts?.length > 0 && (
            <div>
              <button
                onClick={() => setShowExcerpts(!showExcerpts)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {showExcerpts ? 'Hide excerpts' : `Show ${msg.excerpts.length} excerpts`}
              </button>
              {showExcerpts && (
                <div className="mt-2 space-y-2">
                  {msg.excerpts.map((e, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-700 rounded p-2.5 text-xs">
                      <div className="text-indigo-400 font-medium mb-1">{e.document} · p.{e.page} · {e.heading || 'No heading'}</div>
                      <p className="text-gray-300 leading-relaxed">{e.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Ask() {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSubmit(e) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return
    setQuestion('')
    setLoading(true)

    try {
      const res = await apiFetch('/ask', {
        method: 'POST',
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { question: q, ...data }])
    } catch (e) {
      setMessages(prev => [...prev, { question: q, answer: 'Error: ' + e.message, sources: [], excerpts: [] }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <h2 className="text-2xl font-bold mb-6">Ask Your Notes</h2>
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 mb-4">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-12">Ask anything about your study materials.</p>
        )}
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask a question about your notes..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-sm transition-colors"
        >
          Ask
        </button>
      </form>
    </div>
  )
}
