'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Plus,
  Search,
  Star,
  Clock,
  Copy,
  Play,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { API_BASE } from '@/lib/api/config'

interface CrawlConfig {
  targets: string[]
  keywords: string[]
  file_types: string[]
  crawler: string
  limits: {
    max_pages: number
    max_documents: number
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

interface Category {
  id: string
  name: string
  count: number
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

function TemplateCard({
  template,
  onUse,
  onPreview,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  template: Template
  onUse: (id: string) => void
  onPreview: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const IconComponent = templateIcons[template.icon] || FileText
  const CategoryIcon = categoryIcons[template.category] || FileText

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
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 flex-grow">
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
          <span>Sources: {template.config.targets.length > 0 ? template.config.targets.slice(0, 2).join(', ') : 'User defined'}</span>
        </div>
        <div className="flex gap-4 mt-1">
          <span>Files: {template.config.file_types.join(', ')}</span>
          <span>Max: {template.config.limits.max_documents} docs</span>
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
        <button
          onClick={() => onPreview(template.id)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Preview"
        >
          <Eye className="w-5 h-5" />
        </button>
        <button
          onClick={() => onDuplicate(template.id)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Duplicate"
        >
          <Copy className="w-5 h-5" />
        </button>
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

function PreviewModal({
  template,
  onClose,
  onUse,
}: {
  template: Template | null
  onClose: () => void
  onUse: (id: string) => void
}) {
  if (!template) return null

  const IconComponent = templateIcons[template.icon] || FileText

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <IconComponent className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {template.name}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 capitalize">
                  {template.category} Template
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {template.description}
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Target Sources
              </h3>
              <div className="flex flex-wrap gap-2">
                {template.config.targets.length > 0 ? (
                  template.config.targets.map((target) => (
                    <span
                      key={target}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-sm"
                    >
                      {target}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">User must specify</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {template.config.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                File Types
              </h3>
              <div className="flex flex-wrap gap-2">
                {template.config.file_types.map((ft) => (
                  <span
                    key={ft}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg text-sm uppercase"
                  >
                    {ft}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Max Pages</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {template.config.limits.max_pages.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Max Documents</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {template.config.limits.max_documents.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onUse(template.id)
              onClose()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Use This Template
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [showBuiltinOnly, setShowBuiltinOnly] = useState(false)
  const [showCustomOnly, setShowCustomOnly] = useState(false)

  const fetchTemplates = useCallback(async () => {
    try {
      let url = `${API_BASE}/templates`
      const params = new URLSearchParams()

      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (showBuiltinOnly) params.append('builtin_only', 'true')
      if (showCustomOnly) params.append('custom_only', 'true')

      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url)
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }, [searchQuery, selectedCategory, showBuiltinOnly, showCustomOnly])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/templates/categories`)
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchTemplates(), fetchCategories()])
      setLoading(false)
    }
    loadData()
  }, [fetchTemplates, fetchCategories])

  const handleUseTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}/use`, {
        method: 'POST',
      })
      const data = await response.json()
      console.log('Template config:', data.config)
      // Navigate to dashboard with config
      alert(`Template "${data.template_name}" ready! Config loaded for crawl.`)
    } catch (error) {
      console.error('Error using template:', error)
    }
  }

  const handlePreview = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    setPreviewTemplate(template || null)
  }

  const handleDuplicate = async (templateId: string) => {
    const newName = prompt('Enter name for the new template:')
    if (!newName) return

    try {
      const response = await fetch(
        `${API_BASE}/templates/${templateId}/duplicate?new_name=${encodeURIComponent(newName)}`,
        { method: 'POST' }
      )
      if (response.ok) {
        fetchTemplates()
        alert('Template duplicated successfully!')
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`${API_BASE}/templates/${templateId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const builtinTemplates = templates.filter((t) => t.is_builtin)
  const customTemplates = templates.filter((t) => !t.is_builtin)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Templates"
        title="Crawl Templates"
        description="Pre-configured crawl settings for common use cases and repeatable runs."
        actions={
          <button className="gc-button">
            <Plus className="w-5 h-5" />
            New Template
          </button>
        }
      />

      <div className="gc-panel p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--gc-border)] rounded-lg bg-[var(--gc-surface)] text-[var(--gc-ink)] focus:ring-2 focus:ring-[var(--gc-accent)] focus:border-transparent"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-[var(--gc-border)] rounded-lg bg-[var(--gc-surface)] text-[var(--gc-ink)] focus:ring-2 focus:ring-[var(--gc-accent)]"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.count})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--gc-muted)]">
              <input
                type="checkbox"
                checked={showBuiltinOnly}
                onChange={(e) => {
                  setShowBuiltinOnly(e.target.checked)
                  if (e.target.checked) setShowCustomOnly(false)
                }}
                className="rounded"
              />
              Built-in only
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--gc-muted)]">
              <input
                type="checkbox"
                checked={showCustomOnly}
                onChange={(e) => {
                  setShowCustomOnly(e.target.checked)
                  if (e.target.checked) setShowBuiltinOnly(false)
                }}
                className="rounded"
              />
              Custom only
            </label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gc-accent)]"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Built-in Templates */}
          {builtinTemplates.length > 0 && !showCustomOnly && (
            <section>
              <h2 className="text-xl font-semibold text-[var(--gc-ink)] font-display mb-4">
                Built-in Templates ({builtinTemplates.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {builtinTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onPreview={handlePreview}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Custom Templates */}
          {customTemplates.length > 0 && !showBuiltinOnly && (
            <section>
              <h2 className="text-xl font-semibold text-[var(--gc-ink)] font-display mb-4">
                Custom Templates ({customTemplates.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onPreview={handlePreview}
                    onEdit={(id) => alert(`Edit template ${id}`)}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
            </section>
          )}

          {templates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No templates found matching your criteria
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={handleUseTemplate}
        />
      )}
    </div>
  )
}
