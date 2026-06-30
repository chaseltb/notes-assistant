import { useState } from 'react'
import { apiFetch } from '../session.js'

function FlashCard({ card, index }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className="cursor-pointer bg-gray-900 border border-gray-800 hover:border-indigo-600 rounded-xl p-6 min-h-[140px] flex flex-col justify-between transition-colors select-none"
    >
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
        {flipped ? 'Answer' : `Card ${index + 1}`}
      </div>
      <p className="text-sm leading-relaxed flex-1 flex items-center">
        {flipped ? card.answer : card.question}
      </p>
      {flipped && card.source && (
        <div className="text-xs text-gray-500 mt-3 border-t border-gray-800 pt-2">{card.source}</div>
      )}
      {!flipped && (
        <div className="text-xs text-indigo-500 mt-3">Click to reveal answer</div>
      )}
    </div>
  )
}

export default function Flashcards() {
  const [topic, setTopic] = useState('')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleGenerate(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/flashcards', {
        method: 'POST',
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
      setCards(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Failed to generate flashcards: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    const header = 'question,answer,source'
    const rows = cards.map(c => {
      const esc = (s) => '"' + String(s || '').replace(/"/g, '""') + '"'
      return [esc(c.question), esc(c.answer), esc(c.source)].join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flashcards-${topic || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Flashcards</h2>
      <form onSubmit={handleGenerate} className="flex gap-3">
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Topic (optional)..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-sm transition-colors"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>
      )}

      {cards.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{cards.length} cards generated. Click a card to flip it.</p>
            <button
              onClick={exportCSV}
              className="text-sm px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
            >
              Export CSV
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {cards.map((card, i) => <FlashCard key={i} card={card} index={i} />)}
          </div>
        </>
      )}

      {!loading && cards.length === 0 && !error && (
        <p className="text-gray-500 text-sm text-center mt-12">
          Generate flashcards from your study notes. Leave topic blank to cover everything.
        </p>
      )}
    </div>
  )
}
