'use client';

import React, { useState } from 'react';
import {
  Shield, Scale, Rocket, GraduationCap, BookOpen, Newspaper, ChevronDown, Check, Loader2,
} from 'lucide-react';
import type { PresetConfig } from '@/lib/types/settings';

interface PresetSelectorProps {
  presets: PresetConfig[];
  activePreset: string | null;
  onApplyPreset: (presetId: string) => Promise<void>;
  isLoading?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  Shield: Shield,
  Scale: Scale,
  Rocket: Rocket,
  GraduationCap: GraduationCap,
  BookOpen: BookOpen,
  Newspaper: Newspaper,
};

const categoryColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  general: { bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'dark:bg-gray-700', darkText: 'dark:text-gray-300' },
  education: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-900', darkText: 'dark:text-blue-300' },
  legal: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'dark:bg-purple-900', darkText: 'dark:text-purple-300' },
  research: { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-900', darkText: 'dark:text-green-300' },
  news: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-900', darkText: 'dark:text-orange-300' },
};

export function PresetSelector({ presets, activePreset, onApplyPreset, isLoading }: PresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetConfig | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const activePresetData = presets.find((p) => p.id === activePreset);

  const handleApply = async (preset: PresetConfig) => {
    setApplyingId(preset.id);
    try {
      await onApplyPreset(preset.id);
      setIsOpen(false);
      setSelectedPreset(null);
    } finally {
      setApplyingId(null);
    }
  };

  // Group presets by category
  const groupedPresets = presets.reduce((acc, preset) => {
    const cat = preset.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(preset);
    return acc;
  }, {} as Record<string, PresetConfig[]>);

  const categoryOrder = ['general', 'education', 'legal', 'research', 'news'];

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          w-full flex items-center justify-between px-4 py-3 rounded-lg border
          transition-colors
          ${activePresetData
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          }
          hover:border-blue-400 dark:hover:border-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <div className="flex items-center gap-3">
          {activePresetData ? (
            <>
              {(() => {
                const Icon = iconMap[activePresetData.icon] || Shield;
                return <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
              })()}
              <div className="text-left">
                <div className="font-medium text-gray-900 dark:text-white">
                  {activePresetData.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Active preset
                </div>
              </div>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <div className="font-medium text-gray-700 dark:text-gray-300">
                  Custom Settings
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  No preset active
                </div>
              </div>
            </>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setSelectedPreset(null);
            }}
          />

          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-auto">
            <div className="p-2">
              {categoryOrder.map((category) => {
                const categoryPresets = groupedPresets[category];
                if (!categoryPresets || categoryPresets.length === 0) return null;

                const colors = categoryColors[category] || categoryColors.general;

                return (
                  <div key={category} className="mb-3">
                    <div className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${colors.text} ${colors.darkText}`}>
                      {category}
                    </div>

                    {categoryPresets.map((preset) => {
                      const Icon = iconMap[preset.icon] || Shield;
                      const isActive = preset.id === activePreset;
                      const isSelected = selectedPreset?.id === preset.id;
                      const isApplying = applyingId === preset.id;

                      return (
                        <div
                          key={preset.id}
                          className={`
                            relative rounded-lg transition-colors cursor-pointer
                            ${isSelected ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                          `}
                        >
                          <button
                            onClick={() => setSelectedPreset(isSelected ? null : preset)}
                            className="w-full flex items-start gap-3 p-3 text-left"
                          >
                            <div className={`p-2 rounded-lg ${colors.bg} ${colors.darkBg}`}>
                              <Icon className={`w-4 h-4 ${colors.text} ${colors.darkText}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {preset.name}
                                </span>
                                {isActive && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                                    <Check className="w-3 h-3" />
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {preset.description}
                              </p>
                            </div>
                          </button>

                          {/* Expanded details */}
                          {isSelected && (
                            <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-600 mx-3">
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                                <div>
                                  <span className="font-medium">Max Pages:</span>{' '}
                                  {preset.settings.limits.max_pages.toLocaleString()}
                                </div>
                                <div>
                                  <span className="font-medium">Concurrent:</span>{' '}
                                  {preset.settings.performance.concurrent_requests}
                                </div>
                                <div>
                                  <span className="font-medium">Quality:</span>{' '}
                                  {(preset.settings.quality.min_quality_score * 100).toFixed(0)}%
                                </div>
                                <div>
                                  <span className="font-medium">Delay:</span>{' '}
                                  {preset.settings.performance.delay_seconds}s
                                </div>
                              </div>

                              <button
                                onClick={() => handleApply(preset)}
                                disabled={isApplying || isActive}
                                className={`
                                  w-full py-2 px-4 rounded-lg font-medium text-sm
                                  flex items-center justify-center gap-2
                                  transition-colors
                                  ${isActive
                                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }
                                  disabled:opacity-50
                                `}
                              >
                                {isApplying ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Applying...
                                  </>
                                ) : isActive ? (
                                  'Currently Active'
                                ) : (
                                  'Apply Preset'
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
