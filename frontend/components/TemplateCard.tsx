'use client'

import { useState } from 'react'
import {
  BookOpen,
  FileText,
  GraduationCap,
  Scale,
  Beaker,
  Newspaper,
  Building,
  Database,
  TrendingUp,
  Code,
  Star,
  Clock,
  Copy,
  Play,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react'

interface CrawlConfig {
  targets: string[]
  keywords: string[]
  file_types: string[]
  crawler: string
  limits: {
    max_pages: number
    max_documents: number
    max_duration_minutes?: number
    max_file_size_mb?: number
    max_total_size_gb?: number
  }
  quality?: {
    min_quality_score: number
    min_relevance_score: number
  }
  performance?: {
    concurrent_requests: number
    delay_seconds: number
  }
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  icon: string
  is_builtin: boolean
  tags: string[]
  config: CrawlConfig
  used_count: number
  created_at: string
  last_used_at: string | null
}

interface TemplateCardProps {
  template: Template
  onUse: (id: string) => void
  onPreview?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
  compact?: boolean
}

const categoryIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
  education: BookOpen,
  legal: Scale,
  research: Beaker,
  news: Newspaper,
  government: Building,
  technical: Code,
  custom: FileText,
}

const templateIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
  'book-open': BookOpen,
  'file-text': FileText,
  'graduation-cap': GraduationCap,
  'scale': Scale,
  'flask': Beaker,
  'newspaper': Newspaper,
  'building': Building,
  'database': Database,
  'trending-up': TrendingUp,
  'code': Code,
}

export function TemplateCard({
  template,
  onUse,
  onPreview,
  onEdit,
  onDelete,
  onDuplicate,
  compact = false,
}: TemplateCardProps) {
  const IconComponent = templateIcons[template.icon] || FileText
  const CategoryIcon = categoryIcons[template.category] || FileText

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0">
          <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {template.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="capitalize">{template.category}</span>
            <span>-</span>
            <span>{template.used_count} uses</span>
          </div>
        </div>
        <button
          onClick={() => onUse(template.id)}
          className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Use
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
            <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {template.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <CategoryIcon className="w-3 h-3" />
              <span className="capitalize">{template.category}</span>
              {template.is_builtin && (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                  Built-in
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 flex-grow line-clamp-3">
        {template.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {template.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 4 && (
          <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
            +{template.tags.length - 4} more
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4 pb-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4" />
          <span>{template.used_count} uses</span>
        </div>
        {template.last_used_at && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Last used {new Date(template.last_used_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Config Preview */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex gap-4">
          <span>
            Sources:{' '}
            {template.config.targets.length > 0
              ? template.config.targets.slice(0, 2).join(', ')
              : 'User defined'}
          </span>
        </div>
        <div className="flex gap-4 mt-1">
          <span>Files: {template.config.file_types.join(', ')}</span>
          <span>Max: {template.config.limits.max_documents.toLocaleString()} docs</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onUse(template.id)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Play className="w-4 h-4" />
          Use Template
        </button>
        {onPreview && (
          <button
            onClick={() => onPreview(template.id)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Preview"
          >
            <Eye className="w-5 h-5" />
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={() => onDuplicate(template.id)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Duplicate"
          >
            <Copy className="w-5 h-5" />
          </button>
        )}
        {!template.is_builtin && onEdit && (
          <button
            onClick={() => onEdit(template.id)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-5 h-5" />
          </button>
        )}
        {!template.is_builtin && onDelete && (
          <button
            onClick={() => onDelete(template.id)}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default TemplateCard
