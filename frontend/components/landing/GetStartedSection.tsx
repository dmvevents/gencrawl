'use client'

import { useState } from 'react'
import { Copy, Check, Terminal, Rocket } from 'lucide-react'
import Link from 'next/link'

const quickStartSteps = [
  {
    step: 1,
    title: 'Clone the Repository',
    code: 'git clone https://github.com/yourusername/gencrawl.git\ncd gencrawl'
  },
  {
    step: 2,
    title: 'Set Environment Variables',
    code: 'cp .env.example .env\n# Add your API keys:\n# ANTHROPIC_API_KEY=your_key\n# OPENAI_API_KEY=your_key'
  },
  {
    step: 3,
    title: 'Start with Docker Compose',
    code: 'docker-compose up -d'
  },
  {
    step: 4,
    title: 'Access the Dashboard',
    code: '# Frontend: http://localhost:3000\n# API: http://localhost:8000\n# Flower (Task Monitor): http://localhost:5555'
  }
]

export default function GetStartedSection() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 to-blue-900 text-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-lg sm:text-xl text-blue-200 max-w-2xl mx-auto">
            Deploy GenCrawl locally with a single command, or use our hosted dashboard
          </p>
        </div>

        {/* Quick Start Steps */}
        <div className="space-y-6 mb-12">
          {quickStartSteps.map((item, index) => (
            <div
              key={index}
              className="bg-gray-800/50 backdrop-blur rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500 transition-all duration-300"
            >
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-800/70">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
              </div>
              <div className="relative">
                <pre className="p-6 overflow-x-auto text-sm font-mono text-green-400 bg-gray-900">
                  {item.code}
                </pre>
                <button
                  onClick={() => handleCopy(item.code, index)}
                  className="absolute top-4 right-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedIndex === index ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Docker Compose Highlight */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-12">
          <div className="flex items-start gap-4">
            <Terminal className="w-12 h-12 flex-shrink-0" />
            <div>
              <h3 className="text-2xl font-bold mb-3">One Command Deployment</h3>
              <p className="text-blue-100 mb-4">
                Docker Compose handles everything: PostgreSQL, Redis, Weaviate, FastAPI backend,
                Next.js frontend, and Celery workers. Just run <code className="bg-blue-700 px-2 py-1 rounded">docker-compose up</code> and you're ready to crawl.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-white/20 rounded-lg text-sm">
                  PostgreSQL 15
                </div>
                <div className="px-4 py-2 bg-white/20 rounded-lg text-sm">
                  Redis 7
                </div>
                <div className="px-4 py-2 bg-white/20 rounded-lg text-sm">
                  Weaviate 1.27
                </div>
                <div className="px-4 py-2 bg-white/20 rounded-lg text-sm">
                  FastAPI
                </div>
                <div className="px-4 py-2 bg-white/20 rounded-lg text-sm">
                  Next.js 15
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard"
            className="group px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-xl flex items-center gap-2"
          >
            <Rocket className="w-5 h-5 group-hover:translate-y-[-2px] transition-transform" />
            Launch Dashboard Now
          </Link>
          <a
            href="https://github.com/yourusername/gencrawl"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            View on GitHub
          </a>
        </div>

        {/* Additional Resources */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-400 mb-2">&lt; 5 min</div>
            <div className="text-blue-200">Setup Time</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-400 mb-2">MIT</div>
            <div className="text-blue-200">License</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-400 mb-2">$0</div>
            <div className="text-blue-200">Hosting Cost (Self-Hosted)</div>
          </div>
        </div>
      </div>
    </section>
  )
}
