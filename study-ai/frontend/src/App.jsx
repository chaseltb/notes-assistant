import { useEffect } from 'react'
import { useState } from 'react'
import Dashboard from './components/Dashboard.jsx'
import Ask from './components/Ask.jsx'
import PracticeTest from './components/PracticeTest.jsx'
import Flashcards from './components/Flashcards.jsx'
import Logs from './components/Logs.jsx'
import { getSessionId } from './session.js'

const TABS = ['Dashboard', 'Ask', 'Practice Test', 'Flashcards', 'Logs']

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')

  useEffect(() => {
    // Ensure session ID is initialized on load
    getSessionId()
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-8">
          <h1 className="text-xl font-bold text-indigo-400 tracking-tight">Study AI</h1>
          <nav className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === 'Dashboard' && <Dashboard />}
        {activeTab === 'Ask' && <Ask />}
        {activeTab === 'Practice Test' && <PracticeTest />}
        {activeTab === 'Flashcards' && <Flashcards />}
        {activeTab === 'Logs' && <Logs />}
      </main>
    </div>
  )
}
