'use client'

import { useState } from 'react'
import {
  Save,
  X,
  Plus,
  Trash2,
  Settings,
  Target,
  FileText,
  Gauge,
  Shield,
  Zap,
  Database,
  FileOutput,
} from 'lucide-react'

interface TemplateFormData {
  name: string
  description: string
  category: string
  icon: string
  tags: string[]
  config: {
    targets: string[]
    keywords: string[]
    file_types: string[]
    crawler: string
    limits: {
      max_pages: number
      max_documents: number
      max_duration_minutes: number
      max_file_size_mb: number
      max_total_size_gb: number
      max_depth: number
    }
    quality: {
      min_quality_score: number
      min_relevance_score: number
      min_text_length: number
    }
    performance: {
      concurrent_requests: number
      delay_seconds: number
      respect_robots_txt: boolean
    }
    processing: {
      extract_text: boolean
      extract_tables: boolean
      run_ocr: boolean
      enable_deduplication: boolean
    }
    output: {
      format: string
      include_raw_files: boolean
      create_manifest: boolean
    }
  }
}

interface TemplateEditorProps {
  initialData?: Partial<TemplateFormData>
  onSave: (data: TemplateFormData) => void
  onCancel: () => void
  isEditing?: boolean
}

const CATEGORIES = [
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
  { value: 'research', label: 'Research', icon: '🔬' },
  { value: 'news', label: 'News', icon: '📰' },
  { value: 'government', label: 'Government', icon: '🏛️' },
  { value: 'technical', label: 'Technical', icon: '💻' },
  { value: 'custom', label: 'Custom', icon: '📄' },
]

const FILE_TYPES = ['pdf', 'doc', 'docx', 'html', 'txt', 'csv', 'json', 'xlsx', 'md', 'xml']
const CRAWLERS = ['crawl4ai', 'scrapy', 'playwright']
const OUTPUT_FORMATS = ['jsonl', 'json', 'csv']

function ArrayInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
}) {
  const [newValue, setNewValue] = useState('')

  const addValue = () => {
    if (newValue.trim() && !values.includes(newValue.trim())) {
      onChange([...values, newValue.trim()])
      setNewValue('')
    }
  }

  const removeValue = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
          className="flex-1 px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={addValue}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((value, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
          >
            {value}
            <button
              type="button"
              onClick={() => removeValue(index)}
              className="text-gray-500 hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`px-3 py-1 rounded-lg text-sm uppercase transition-colors ${
              selected.includes(option)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TemplateEditor({
  initialData,
  onSave,
  onCancel,
  isEditing = false,
}: TemplateEditorProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || 'custom',
    icon: initialData?.icon || 'file-text',
    tags: initialData?.tags || [],
    config: {
      targets: initialData?.config?.targets || [],
      keywords: initialData?.config?.keywords || [],
      file_types: initialData?.config?.file_types || ['pdf'],
      crawler: initialData?.config?.crawler || 'crawl4ai',
      limits: {
        max_pages: initialData?.config?.limits?.max_pages || 10000,
        max_documents: initialData?.config?.limits?.max_documents || 5000,
        max_duration_minutes: initialData?.config?.limits?.max_duration_minutes || 360,
        max_file_size_mb: initialData?.config?.limits?.max_file_size_mb || 50,
        max_total_size_gb: initialData?.config?.limits?.max_total_size_gb || 10,
        max_depth: initialData?.config?.limits?.max_depth || 5,
      },
      quality: {
        min_quality_score: initialData?.config?.quality?.min_quality_score || 0.7,
        min_relevance_score: initialData?.config?.quality?.min_relevance_score || 0.6,
        min_text_length: initialData?.config?.quality?.min_text_length || 100,
      },
      performance: {
        concurrent_requests: initialData?.config?.performance?.concurrent_requests || 10,
        delay_seconds: initialData?.config?.performance?.delay_seconds || 1,
        respect_robots_txt: initialData?.config?.performance?.respect_robots_txt ?? true,
      },
      processing: {
        extract_text: initialData?.config?.processing?.extract_text ?? true,
        extract_tables: initialData?.config?.processing?.extract_tables ?? true,
        run_ocr: initialData?.config?.processing?.run_ocr ?? false,
        enable_deduplication: initialData?.config?.processing?.enable_deduplication ?? true,
      },
      output: {
        format: initialData?.config?.output?.format || 'jsonl',
        include_raw_files: initialData?.config?.output?.include_raw_files ?? true,
        create_manifest: initialData?.config?.output?.create_manifest ?? true,
      },
    },
  })

  const [activeSection, setActiveSection] = useState('basic')

  const updateConfig = (section: string, key: string, value: any) => {
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        [section]: {
          ...(formData.config as any)[section],
          [key]: value,
        },
      },
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: Settings },
    { id: 'targets', label: 'Targets', icon: Target },
    { id: 'limits', label: 'Limits', icon: Gauge },
    { id: 'quality', label: 'Quality', icon: Shield },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'processing', label: 'Processing', icon: Database },
    { id: 'output', label: 'Output', icon: FileOutput },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          )
        })}
      </div>

      {/* Basic Info Section */}
      {activeSection === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="My Custom Template"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Describe what this template does..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    formData.category === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <ArrayInput
            label="Tags"
            values={formData.tags}
            onChange={(tags) => setFormData({ ...formData, tags })}
            placeholder="Add a tag..."
          />
        </div>
      )}

      {/* Targets Section */}
      {activeSection === 'targets' && (
        <div className="space-y-4">
          <ArrayInput
            label="Target URLs/Domains"
            values={formData.config.targets}
            onChange={(targets) =>
              setFormData({ ...formData, config: { ...formData.config, targets } })
            }
            placeholder="example.com"
          />

          <ArrayInput
            label="Keywords"
            values={formData.config.keywords}
            onChange={(keywords) =>
              setFormData({ ...formData, config: { ...formData.config, keywords } })
            }
            placeholder="Add keyword..."
          />

          <CheckboxGroup
            label="File Types"
            options={FILE_TYPES}
            selected={formData.config.file_types}
            onChange={(file_types) =>
              setFormData({ ...formData, config: { ...formData.config, file_types } })
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Crawler
            </label>
            <div className="flex gap-2">
              {CRAWLERS.map((crawler) => (
                <button
                  key={crawler}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, config: { ...formData.config, crawler } })
                  }
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    formData.config.crawler === crawler
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {crawler}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Limits Section */}
      {activeSection === 'limits' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Pages
            </label>
            <input
              type="number"
              value={formData.config.limits.max_pages}
              onChange={(e) => updateConfig('limits', 'max_pages', parseInt(e.target.value))}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Documents
            </label>
            <input
              type="number"
              value={formData.config.limits.max_documents}
              onChange={(e) => updateConfig('limits', 'max_documents', parseInt(e.target.value))}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.config.limits.max_duration_minutes}
              onChange={(e) =>
                updateConfig('limits', 'max_duration_minutes', parseInt(e.target.value))
              }
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max File Size (MB)
            </label>
            <input
              type="number"
              value={formData.config.limits.max_file_size_mb}
              onChange={(e) => updateConfig('limits', 'max_file_size_mb', parseInt(e.target.value))}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Total Size (GB)
            </label>
            <input
              type="number"
              value={formData.config.limits.max_total_size_gb}
              onChange={(e) =>
                updateConfig('limits', 'max_total_size_gb', parseFloat(e.target.value))
              }
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="0.1"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Link Depth
            </label>
            <input
              type="number"
              value={formData.config.limits.max_depth}
              onChange={(e) => updateConfig('limits', 'max_depth', parseInt(e.target.value))}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="1"
              max="20"
            />
          </div>
        </div>
      )}

      {/* Quality Section */}
      {activeSection === 'quality' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Min Quality Score: {formData.config.quality.min_quality_score}
            </label>
            <input
              type="range"
              value={formData.config.quality.min_quality_score}
              onChange={(e) =>
                updateConfig('quality', 'min_quality_score', parseFloat(e.target.value))
              }
              className="w-full"
              min="0"
              max="1"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Min Relevance Score: {formData.config.quality.min_relevance_score}
            </label>
            <input
              type="range"
              value={formData.config.quality.min_relevance_score}
              onChange={(e) =>
                updateConfig('quality', 'min_relevance_score', parseFloat(e.target.value))
              }
              className="w-full"
              min="0"
              max="1"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Min Text Length (chars)
            </label>
            <input
              type="number"
              value={formData.config.quality.min_text_length}
              onChange={(e) => updateConfig('quality', 'min_text_length', parseInt(e.target.value))}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="0"
            />
          </div>
        </div>
      )}

      {/* Performance Section */}
      {activeSection === 'performance' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Concurrent Requests
            </label>
            <input
              type="number"
              value={formData.config.performance.concurrent_requests}
              onChange={(e) =>
                updateConfig('performance', 'concurrent_requests', parseInt(e.target.value))
              }
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="1"
              max="50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Delay Between Requests (seconds)
            </label>
            <input
              type="number"
              value={formData.config.performance.delay_seconds}
              onChange={(e) =>
                updateConfig('performance', 'delay_seconds', parseFloat(e.target.value))
              }
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              min="0"
              step="0.5"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.config.performance.respect_robots_txt}
              onChange={(e) =>
                updateConfig('performance', 'respect_robots_txt', e.target.checked)
              }
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Respect robots.txt</span>
          </label>
        </div>
      )}

      {/* Processing Section */}
      {activeSection === 'processing' && (
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.config.processing.extract_text}
              onChange={(e) => updateConfig('processing', 'extract_text', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Extract text from PDFs</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.config.processing.extract_tables}
              onChange={(e) => updateConfig('processing', 'extract_tables', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Extract tables</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.config.processing.run_ocr}
              onChange={(e) => updateConfig('processing', 'run_ocr', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Run OCR on scanned documents</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.config.processing.enable_deduplication}
              onChange={(e) => updateConfig('processing', 'enable_deduplication', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable deduplication</span>
          </label>
        </div>
      )}

      {/* Output Section */}
      {activeSection === 'output' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Output Format
            </label>
            <div className="flex gap-2">
              {OUTPUT_FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => updateConfig('output', 'format', format)}
                  className={`px-4 py-2 rounded-lg uppercase transition-colors ${
                    formData.config.output.format === format
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.config.output.include_raw_files}
              onChange={(e) => updateConfig('output', 'include_raw_files', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Include raw files</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.config.output.create_manifest}
              onChange={(e) => updateConfig('output', 'create_manifest', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Create manifest.json</span>
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isEditing ? 'Update Template' : 'Save Template'}
        </button>
      </div>
    </form>
  )
}

export default TemplateEditor
