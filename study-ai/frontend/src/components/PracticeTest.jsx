import { useState } from 'react'
import { apiFetch } from '../session.js'

function MCQQuestion({ q, index }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">MCQ {index + 1}</div>
      <p className="text-sm font-medium">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const letter = ['A', 'B', 'C', 'D'][i]
          const isCorrect = revealed && letter === q.answer
          const isWrong = revealed && selected === letter && letter !== q.answer
          return (
            <button
              key={i}
              onClick={() => { setSelected(letter); setRevealed(true) }}
              className={`w-full text-left text-sm px-4 py-2.5 rounded-lg border transition-colors ${
                isCorrect ? 'bg-green-900/40 border-green-600 text-green-300' :
                isWrong ? 'bg-red-900/40 border-red-600 text-red-300' :
                selected === letter ? 'bg-gray-700 border-gray-600' :
                'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {revealed && (
        <div className="text-xs text-gray-400">
          Correct answer: <span className="text-green-400 font-medium">{q.answer}</span>
          {q.source && <span className="ml-3 text-gray-500">· {q.source}</span>}
        </div>
      )}
    </div>
  )
}

function ShortLongQuestion({ q, index, type }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{type} {index + 1}</div>
      <p className="text-sm font-medium">{q.question}</p>
      <button
        onClick={() => setRevealed(!revealed)}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        {revealed ? 'Hide answer' : 'Reveal answer'}
      </button>
      {revealed && (
        <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 leading-relaxed">
          {q.answer}
          {q.source && <div className="text-xs text-gray-500 mt-2">{q.source}</div>}
        </div>
      )}
    </div>
  )
}

export default function PracticeTest() {
  const [form, setForm] = useState({ topic: '', difficulty: 'Medium', mcq: 5, short: 3, long: 1 })
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleGenerate(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setQuiz(null)
    try {
      const res = await apiFetch('/quiz', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setQuiz(data)
    } catch (err) {
      setError('Failed to generate quiz: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Practice Test</h2>
      <form onSubmit={handleGenerate} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1.5">Topic (optional)</label>
            <input
              value={form.topic}
              onChange={e => setForm({ ...form, topic: e.target.value })}
              placeholder="e.g. Thermodynamics, Cell biology..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={e => setForm({ ...form, difficulty: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">MCQ count</label>
            <input
              type="number" min={0} max={20}
              value={form.mcq}
              onChange={e => setForm({ ...form, mcq: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Short answer count</label>
            <input
              type="number" min={0} max={10}
              value={form.short}
              onChange={e => setForm({ ...form, short: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Long answer count</label>
            <input
              type="number" min={0} max={5}
              value={form.long}
              onChange={e => setForm({ ...form, long: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Practice Test'}
        </button>
      </form>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>
      )}

      {quiz && (
        <div className="space-y-4">
          {quiz.mcq?.map((q, i) => <MCQQuestion key={i} q={q} index={i} />)}
          {quiz.short?.map((q, i) => <ShortLongQuestion key={i} q={q} index={i} type="Short Answer" />)}
          {quiz.long?.map((q, i) => <ShortLongQuestion key={i} q={q} index={i} type="Long Answer" />)}
        </div>
      )}
    </div>
  )
}
