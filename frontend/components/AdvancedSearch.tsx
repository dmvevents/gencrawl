'use client';

/**
 * Advanced Search Component
 *
 * Provides comprehensive search and filtering for crawl history:
 * - Text search
 * - Status filter
 * - Date range
 * - Quality score range
 * - Saved searches
 */

import { useState, useCallback } from 'react';
import {
  Search,
  Filter,
  Calendar,
  X,
  Save,
  Bookmark,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { sessionManager } from '@/lib/session/SessionManager';

// Filter types
export interface SearchFilters {
  query: string;
  status: string[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
  qualityRange: {
    min: number;
    max: number;
  };
  documentRange: {
    min: number;
    max: number;
  };
  sources: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  created_at: string;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  className?: string;
  availableSources?: string[];
}

const defaultFilters: SearchFilters = {
  query: '',
  status: [],
  dateRange: { start: null, end: null },
  qualityRange: { min: 0, max: 100 },
  documentRange: { min: 0, max: 10000 },
  sources: [],
  sortBy: 'started_at',
  sortOrder: 'desc',
};

const statusOptions = [
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'running', label: 'Running', color: 'blue' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'paused', label: 'Paused', color: 'orange' },
  { value: 'queued', label: 'Queued', color: 'gray' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
];

const sortOptions = [
  { value: 'started_at', label: 'Date (newest first)', order: 'desc' as const },
  { value: 'started_at_asc', label: 'Date (oldest first)', order: 'asc' as const },
  { value: 'duration_seconds', label: 'Duration (longest)', order: 'desc' as const },
  { value: 'documents_found', label: 'Documents (most)', order: 'desc' as const },
  { value: 'quality_score', label: 'Quality (highest)', order: 'desc' as const },
];

export function AdvancedSearch({
  onSearch,
  className = '',
  availableSources = [],
}: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    // Load from session/localStorage
    try {
      const stored = localStorage.getItem('saved_searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  // Update filters
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Handle search
  const handleSearch = useCallback(() => {
    onSearch(filters);
  }, [filters, onSearch]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    onSearch(defaultFilters);
  }, [onSearch]);

  // Save current search
  const saveSearch = useCallback(() => {
    if (!saveSearchName.trim()) return;

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: saveSearchName,
      filters: { ...filters },
      created_at: new Date().toISOString(),
    };

    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('saved_searches', JSON.stringify(updated));
    setSaveSearchName('');
    setSaveDialogOpen(false);
  }, [saveSearchName, filters, savedSearches]);

  // Load saved search
  const loadSearch = useCallback((search: SavedSearch) => {
    setFilters(search.filters);
    onSearch(search.filters);
  }, [onSearch]);

  // Delete saved search
  const deleteSearch = useCallback((id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('saved_searches', JSON.stringify(updated));
  }, [savedSearches]);

  // Toggle status filter
  const toggleStatus = useCallback((status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  }, []);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Main search bar */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search crawls by query, URL, or documents..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Toggle advanced filters */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-4 py-2.5 flex items-center gap-2 rounded-lg border transition-colors ${
              isExpanded || filters.status.length > 0 || filters.dateRange.start || filters.sources.length > 0
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Search button */}
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Search
          </button>
        </div>

        {/* Quick status filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleStatus(option.value)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filters.status.includes(option.value)
                  ? `bg-${option.color}-100 dark:bg-${option.color}-900/30 text-${option.color}-800 dark:text-${option.color}-300 ring-1 ring-${option.color}-300`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced filters */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {/* Date range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateRange.start || ''}
                  onChange={(e) =>
                    updateFilter('dateRange', { ...filters.dateRange, start: e.target.value || null })
                  }
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-gray-400 self-center">to</span>
                <input
                  type="date"
                  value={filters.dateRange.end || ''}
                  onChange={(e) =>
                    updateFilter('dateRange', { ...filters.dateRange, end: e.target.value || null })
                  }
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Quality range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quality Score
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.qualityRange.min}
                  onChange={(e) =>
                    updateFilter('qualityRange', { ...filters.qualityRange, min: Number(e.target.value) })
                  }
                  className="w-20 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.qualityRange.max}
                  onChange={(e) =>
                    updateFilter('qualityRange', { ...filters.qualityRange, max: Number(e.target.value) })
                  }
                  className="w-20 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>

            {/* Documents range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Documents Found
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  value={filters.documentRange.min}
                  onChange={(e) =>
                    updateFilter('documentRange', { ...filters.documentRange, min: Number(e.target.value) })
                  }
                  className="w-24 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  min="0"
                  value={filters.documentRange.max}
                  onChange={(e) =>
                    updateFilter('documentRange', { ...filters.documentRange, max: Number(e.target.value) })
                  }
                  className="w-24 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Sort by */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={`${filters.sortBy}_${filters.sortOrder}`}
                onChange={(e) => {
                  const option = sortOptions.find(
                    (o) => `${o.value}${o.order === 'asc' ? '_asc' : ''}` === e.target.value || o.value === e.target.value
                  );
                  if (option) {
                    updateFilter('sortBy', option.value.replace('_asc', ''));
                    updateFilter('sortOrder', option.order);
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {sortOptions.map((option) => (
                  <option key={`${option.value}_${option.order}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={() => setSaveDialogOpen(true)}
                className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Search
              </button>
            </div>

            {/* Saved searches */}
            {savedSearches.length > 0 && (
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Saved:</span>
                {savedSearches.slice(0, 3).map((search) => (
                  <button
                    key={search.id}
                    onClick={() => loadSearch(search)}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {search.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save search dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Save Search
            </h3>
            <input
              type="text"
              placeholder="Enter a name for this search..."
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setSaveDialogOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSearch}
                disabled={!saveSearchName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedSearch;
