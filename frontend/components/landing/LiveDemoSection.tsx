'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Copy, Check } from 'lucide-react'

const exampleQueries = [
  "Find all CXC CSEC Mathematics past papers from 2020-2025",
  "Get recent AI research papers on web scraping from arxiv.org",
  "Collect Trinidad SEA practice questions for all subjects",
  "Download all CAPE Chemistry syllabi and past papers"
]

export default function LiveDemoSection() {
  const [query, setQuery] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [config, setConfig] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const handleAnalyze = () => {
    setIsAnalyzing(true)
    // Simulate LLM analysis
    setTimeout(() => {
      setConfig({
        targets: ["cxc.org"],
        crawler: "scrapy",
        strategy: "recursive",
        filters: {
          keywords: ["mathematics", "past paper"],
          date_range: ["2020-01-01", "2025-12-31"],
          file_types: ["pdf"]
        },
        extraction: {
          title: "CSS selector: .document-title",
          date: "Regex: \\d{4}",
          category: "LLM classification"
        },
        output: {
          structure: "subject/year/",
          naming: "{exam}_{subject}_{year}.pdf",
          format: "nemo_curator_jsonl"
        }
      })
      setIsAnalyzing(false)
    }, 2000)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50" id="demo">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Try It Live
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            See how GenCrawl transforms natural language into intelligent crawl configurations
          </p>
        </div>

        {/* Demo Interface */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Input Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              What do you want to crawl?
            </label>
            <textarea
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
              rows={4}
              placeholder="Describe in plain English what you want to crawl..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Example Queries */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-600 mb-3">Try these examples:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(example)}
                  className="text-left px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!query || isAnalyzing}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing with Claude Sonnet 4.5...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze Query
              </>
            )}
          </button>

          {/* Generated Configuration */}
          {config && (
            <div className="mt-8 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Generated Configuration
                </h3>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </div>
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Ready to deploy!</strong> This configuration can be used immediately to start crawling.
                  The system will use <strong>Scrapy</strong> for fast HTTP crawling and output data in{' '}
                  <strong>NVIDIA Nemo Curator JSONL format</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
