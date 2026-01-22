'use client'

import {
  MessageSquare,
  Zap,
  Database,
  BarChart3,
  Github,
  Sparkles
} from 'lucide-react'

const features = [
  {
    icon: MessageSquare,
    title: 'Natural Language Interface',
    description: 'Just describe what you want to crawl in plain English. No configuration files, no coding required.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    icon: Zap,
    title: 'Multi-Crawler Support',
    description: 'Automatically selects the best crawler: Scrapy for speed, Crawl4AI for LLM-ready content, Playwright for JavaScript.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    icon: Database,
    title: 'NVIDIA Nemo Curator Compatible',
    description: 'Outputs clean JSONL datasets ready for LLM pre-training, fine-tuning, or RAG applications.',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    icon: BarChart3,
    title: 'Real-Time Monitoring',
    description: 'Track crawl progress, system health, document statistics, and quality metrics in a beautiful dashboard.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  {
    icon: Github,
    title: '100% Open Source & Free',
    description: 'MIT licensed, deploy anywhere, no usage limits. Complete control over your data and infrastructure.',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100'
  },
  {
    icon: Sparkles,
    title: 'LLM-Powered Quality',
    description: 'Uses Claude Sonnet 4.5 and GPT-5.2 for metadata extraction, quality scoring, and intelligent filtering.',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  }
]

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-white" id="features">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Powerful Features
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to build high-quality datasets for your AI models
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white"
            >
              <div className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
