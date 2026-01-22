'use client'

import { GraduationCap, Scale, FileText, TrendingUp } from 'lucide-react'

const useCases = [
  {
    icon: GraduationCap,
    title: 'Caribbean Education',
    description: 'Collect comprehensive datasets for SEA, CSEC, and CAPE examinations',
    examples: [
      'Past papers from CXC (2015-2025)',
      'Ministry of Education study guides',
      'SEA practice questions and solutions',
      'CAPE syllabi and marking schemes'
    ],
    color: 'from-blue-600 to-blue-700'
  },
  {
    icon: Scale,
    title: 'Legal Document Aggregation',
    description: 'Build searchable databases of case law, statutes, and regulations',
    examples: [
      'Court decisions and rulings',
      'Legislative acts and amendments',
      'Legal opinions and briefs',
      'Regulatory compliance documents'
    ],
    color: 'from-purple-600 to-purple-700'
  },
  {
    icon: FileText,
    title: 'Academic Paper Collection',
    description: 'Gather research papers for literature reviews and meta-analysis',
    examples: [
      'ArXiv preprints by topic',
      'PubMed medical research',
      'Conference proceedings',
      'University repository theses'
    ],
    color: 'from-green-600 to-green-700'
  },
  {
    icon: TrendingUp,
    title: 'Market Research',
    description: 'Extract competitive intelligence and industry insights',
    examples: [
      'Product pricing and specifications',
      'Company annual reports',
      'Industry news and trends',
      'Customer reviews and sentiment'
    ],
    color: 'from-orange-600 to-orange-700'
  }
]

export default function UseCasesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Use Cases
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            From education to research, GenCrawl adapts to your data collection needs
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 hover:shadow-2xl transition-all duration-300"
            >
              {/* Gradient Header */}
              <div className={`bg-gradient-to-r ${useCase.color} p-6 text-white`}>
                <useCase.icon className="w-10 h-10 mb-3" />
                <h3 className="text-2xl font-bold mb-2">{useCase.title}</h3>
                <p className="text-blue-100">{useCase.description}</p>
              </div>

              {/* Examples List */}
              <div className="p-6 bg-white">
                <p className="text-sm font-semibold text-gray-700 mb-3">Example Crawls:</p>
                <ul className="space-y-2">
                  {useCase.examples.map((example, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 transition-all duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Custom Use Case CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Have a unique use case?</p>
          <a
            href="/dashboard"
            className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Build Your Custom Crawler
          </a>
        </div>
      </div>
    </section>
  )
}
