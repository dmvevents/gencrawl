'use client'

import {
  Brain,
  Zap,
  Database,
  Server,
  Code,
  Container
} from 'lucide-react'

const techStack = [
  {
    category: 'LLM Orchestration',
    icon: Brain,
    color: 'from-purple-600 to-pink-600',
    technologies: [
      { name: 'Claude Sonnet 4.5', desc: '82% SWE-Bench, primary analysis' },
      { name: 'GPT-5.2', desc: '80% SWE-Bench, web search' },
      { name: 'Llama 3.3 70B', desc: 'Local/offline fallback' }
    ]
  },
  {
    category: 'Crawlers',
    icon: Zap,
    color: 'from-blue-600 to-cyan-600',
    technologies: [
      { name: 'Scrapy', desc: 'Fast HTTP crawling (100+ pages/min)' },
      { name: 'Crawl4AI', desc: 'LLM-ready clean markdown' },
      { name: 'Playwright', desc: 'JavaScript-heavy sites' }
    ]
  },
  {
    category: 'Data Processing',
    icon: Code,
    color: 'from-green-600 to-emerald-600',
    technologies: [
      { name: 'PyMuPDF', desc: 'PDF text extraction' },
      { name: 'MinerU', desc: 'Complex PDF layouts' },
      { name: 'Tesseract OCR', desc: 'Scanned document OCR' }
    ]
  },
  {
    category: 'Vector Storage',
    icon: Database,
    color: 'from-orange-600 to-red-600',
    technologies: [
      { name: 'Weaviate', desc: 'Vector database & semantic search' },
      { name: 'OpenAI Embeddings', desc: 'text-embedding-3-small' },
      { name: 'PostgreSQL 15', desc: 'Metadata storage' }
    ]
  },
  {
    category: 'Task Queue',
    icon: Server,
    color: 'from-indigo-600 to-purple-600',
    technologies: [
      { name: 'Celery', desc: 'Distributed task processing' },
      { name: 'Redis 7', desc: 'Message broker & cache' },
      { name: 'Flower', desc: 'Task monitoring UI' }
    ]
  },
  {
    category: 'Infrastructure',
    icon: Container,
    color: 'from-gray-700 to-gray-900',
    technologies: [
      { name: 'Docker Compose', desc: 'Multi-container orchestration' },
      { name: 'FastAPI', desc: 'High-performance Python API' },
      { name: 'Next.js 15', desc: 'React dashboard UI' }
    ]
  }
]

export default function TechStackSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Powered by Best-in-Class Tools
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Built on cutting-edge AI models and production-grade infrastructure
          </p>
        </div>

        {/* Tech Stack Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {techStack.map((category, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              {/* Category Header */}
              <div className={`bg-gradient-to-r ${category.color} p-6 text-white`}>
                <category.icon className="w-8 h-8 mb-3" />
                <h3 className="text-xl font-bold">{category.category}</h3>
              </div>

              {/* Technologies List */}
              <div className="p-6">
                <ul className="space-y-4">
                  {category.technologies.map((tech, i) => (
                    <li key={i}>
                      <div className="font-semibold text-gray-900">{tech.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{tech.desc}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="inline-block px-6 py-3 bg-white rounded-xl shadow-md">
            <p className="text-gray-700">
              <strong>All components are 100% open source</strong> - no vendor lock-in
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
