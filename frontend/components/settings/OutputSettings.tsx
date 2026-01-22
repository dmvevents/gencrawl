'use client';

import React from 'react';
import { FileOutput, FileJson, FolderTree, Archive, FileText } from 'lucide-react';
import { SettingsSlider } from './SettingsSlider';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSelect } from './SettingsSelect';
import type { OutputSettings as OutputSettingsType, OutputFormat } from '@/lib/types/settings';

interface OutputSettingsProps {
  settings: OutputSettingsType;
  onChange: (key: keyof OutputSettingsType, value: any) => void;
}

export function OutputSettings({ settings, onChange }: OutputSettingsProps) {
  const formatOptions = [
    { value: 'jsonl', label: 'JSONL (JSON Lines)' },
    { value: 'json', label: 'JSON' },
    { value: 'csv', label: 'CSV' },
    { value: 'parquet', label: 'Parquet' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
          <FileOutput className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Output
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure output format and structure
          </p>
        </div>
      </div>

      {/* Format */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <FileJson className="w-4 h-4" />
          Output Format
        </h4>

        <SettingsSelect
          label="File Format"
          value={settings.format}
          options={formatOptions}
          onChange={(v) => onChange('format', v as OutputFormat)}
          description="Format for the output data files"
        />

        <SettingsToggle
          label="Include Raw Files"
          checked={settings.include_raw_files}
          onChange={(v) => onChange('include_raw_files', v)}
          description="Keep original downloaded files alongside extracted data"
        />

        <SettingsToggle
          label="Create Manifest"
          checked={settings.create_manifest}
          onChange={(v) => onChange('create_manifest', v)}
          description="Generate manifest.json with crawl metadata and file list"
        />

        <SettingsToggle
          label="Include Failed URLs"
          checked={settings.include_failed_urls}
          onChange={(v) => onChange('include_failed_urls', v)}
          description="Include list of failed URLs in output"
        />
      </div>

      {/* File Organization */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <FolderTree className="w-4 h-4" />
          File Organization
        </h4>

        <SettingsToggle
          label="Hierarchical Structure"
          checked={settings.hierarchical_structure}
          onChange={(v) => onChange('hierarchical_structure', v)}
          description="Organize files by domain/path hierarchy instead of flat structure"
        />

        <SettingsToggle
          label="Preserve Original Filenames"
          checked={settings.preserve_filenames}
          onChange={(v) => onChange('preserve_filenames', v)}
          description="Keep original filenames instead of generating new ones"
        />

        <SettingsToggle
          label="Add Timestamps to Filenames"
          checked={settings.add_timestamps}
          onChange={(v) => onChange('add_timestamps', v)}
          description="Add crawl timestamp to filenames for versioning"
        />

        <SettingsSlider
          label="Maximum Filename Length"
          value={settings.max_filename_length}
          min={50}
          max={500}
          step={10}
          unit="chars"
          onChange={(v) => onChange('max_filename_length', v)}
          description="Truncate filenames longer than this"
        />
      </div>

      {/* Compression */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Archive className="w-4 h-4" />
          Compression
        </h4>

        <SettingsToggle
          label="Compress Output"
          checked={settings.compress_output}
          onChange={(v) => onChange('compress_output', v)}
          description="ZIP the final output folder for easier download"
        />
      </div>

      {/* Output Preview */}
      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-3">
          Output Structure Preview
        </h4>
        <div className="font-mono text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded p-3 space-y-1">
          <div className="flex items-center gap-2">
            <FolderTree className="w-3 h-3" />
            <span>crawl_output/</span>
          </div>
          {settings.create_manifest && (
            <div className="flex items-center gap-2 ml-4">
              <FileText className="w-3 h-3" />
              <span>manifest.json</span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-4">
            <FileJson className="w-3 h-3" />
            <span>data.{settings.format}</span>
          </div>
          {settings.include_raw_files && (
            <>
              <div className="flex items-center gap-2 ml-4">
                <FolderTree className="w-3 h-3" />
                <span>raw/</span>
              </div>
              {settings.hierarchical_structure ? (
                <>
                  <div className="ml-8 text-gray-500">example.com/</div>
                  <div className="ml-12 text-gray-500">path/</div>
                  <div className="ml-16 text-gray-500">document.pdf</div>
                </>
              ) : (
                <>
                  <div className="ml-8 text-gray-500">example_com_path_document.pdf</div>
                </>
              )}
            </>
          )}
          {settings.include_failed_urls && (
            <div className="flex items-center gap-2 ml-4">
              <FileText className="w-3 h-3" />
              <span>failed_urls.txt</span>
            </div>
          )}
          {settings.compress_output && (
            <div className="flex items-center gap-2 mt-2 text-orange-600 dark:text-orange-400">
              <Archive className="w-3 h-3" />
              <span>compressed to: crawl_output.zip</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
