'use client';

import React from 'react';
import { Cpu, FileText, Image, Table, Scan, Copy, Shield, Sparkles } from 'lucide-react';
import { SettingsSlider } from './SettingsSlider';
import { SettingsToggle } from './SettingsToggle';
import type { ProcessingSettings as ProcessingSettingsType } from '@/lib/types/settings';

interface ProcessingSettingsProps {
  settings: ProcessingSettingsType;
  onChange: (key: keyof ProcessingSettingsType, value: any) => void;
}

export function ProcessingSettings({ settings, onChange }: ProcessingSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
          <Cpu className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Processing
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Data extraction and transformation options
          </p>
        </div>
      </div>

      {/* Content Extraction */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Content Extraction
        </h4>

        <SettingsToggle
          label="Extract Text"
          checked={settings.extract_text}
          onChange={(v) => onChange('extract_text', v)}
          description="Extract text content from PDFs and documents"
        />

        <SettingsToggle
          label="Extract Tables"
          checked={settings.extract_tables}
          onChange={(v) => onChange('extract_tables', v)}
          description="Detect and extract tables from documents"
        />

        <SettingsToggle
          label="Extract Images"
          checked={settings.extract_images}
          onChange={(v) => onChange('extract_images', v)}
          description="Extract embedded images from documents"
        />

        <SettingsToggle
          label="Extract Metadata"
          checked={settings.extract_metadata}
          onChange={(v) => onChange('extract_metadata', v)}
          description="Extract document metadata (title, author, date, etc.)"
        />
      </div>

      {/* OCR & Vision */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Scan className="w-4 h-4" />
          OCR & Vision Processing
        </h4>

        <SettingsToggle
          label="Run OCR"
          checked={settings.run_ocr}
          onChange={(v) => onChange('run_ocr', v)}
          description="Run Optical Character Recognition on scanned documents and images"
        />

        <SettingsToggle
          label="Language Detection"
          checked={settings.language_detection}
          onChange={(v) => onChange('language_detection', v)}
          description="Automatically detect document language"
        />

        <SettingsToggle
          label="Content Classification"
          checked={settings.content_classification}
          onChange={(v) => onChange('content_classification', v)}
          description="Classify document content type (article, paper, form, etc.)"
        />
      </div>

      {/* Deduplication */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Deduplication
        </h4>

        <SettingsToggle
          label="Enable Deduplication"
          checked={settings.enable_deduplication}
          onChange={(v) => onChange('enable_deduplication', v)}
          description="Remove duplicate documents based on content similarity"
        />

        <SettingsSlider
          label="Similarity Threshold"
          value={settings.dedupe_threshold}
          min={0.5}
          max={1}
          step={0.01}
          onChange={(v) => onChange('dedupe_threshold', v)}
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          description="Documents above this similarity are considered duplicates"
          disabled={!settings.enable_deduplication}
        />
      </div>

      {/* Privacy & Security */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Privacy & Security
        </h4>

        <SettingsToggle
          label="PII Redaction"
          checked={settings.enable_pii_redaction}
          onChange={(v) => onChange('enable_pii_redaction', v)}
          description="Automatically redact personally identifiable information"
        />
      </div>

      {/* AI & Embeddings */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          AI Processing
        </h4>

        <SettingsToggle
          label="Generate Embeddings"
          checked={settings.generate_embeddings}
          onChange={(v) => onChange('generate_embeddings', v)}
          description="Generate vector embeddings for semantic search"
        />

        <SettingsToggle
          label="Run Nemo Curator"
          checked={settings.run_nemo_curator}
          onChange={(v) => onChange('run_nemo_curator', v)}
          description="Process documents with NVIDIA Nemo Curator for LLM training data"
        />
      </div>

      {/* Processing Summary */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
          Active Processing Steps
        </h4>
        <div className="flex flex-wrap gap-2">
          {settings.extract_text && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs">
              Text Extraction
            </span>
          )}
          {settings.extract_tables && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs">
              Table Extraction
            </span>
          )}
          {settings.extract_images && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs">
              Image Extraction
            </span>
          )}
          {settings.run_ocr && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs">
              OCR
            </span>
          )}
          {settings.enable_deduplication && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs">
              Deduplication
            </span>
          )}
          {settings.enable_pii_redaction && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs">
              PII Redaction
            </span>
          )}
          {settings.generate_embeddings && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs">
              Embeddings
            </span>
          )}
          {settings.run_nemo_curator && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs">
              Nemo Curator
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
