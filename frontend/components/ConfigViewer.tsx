'use client'

/**
 * Configuration Viewer Component
 * Displays the LLM-generated crawl configuration in a readable format
 */

interface ConfigViewerProps {
  config: any
  className?: string
}

export function ConfigViewer({ config, className = '' }: ConfigViewerProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Targets */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Target Sources
        </h3>
        <div className="space-y-2">
          {config?.targets?.map((target: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                {i + 1}
              </span>
              <a
                href={target}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {target}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy & Crawler */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Crawl Strategy
          </h3>
          <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
            {config?.strategy || 'N/A'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Crawler Type
          </h3>
          <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
            {config?.crawler || 'N/A'}
          </p>
        </div>
      </div>

      {/* Filters */}
      {config?.filters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Filters
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {config.filters.date_range && (
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Date Range
                </p>
                <p className="text-gray-900 dark:text-white">
                  {config.filters.date_range[0]} to {config.filters.date_range[1]}
                </p>
              </div>
            )}
            {config.filters.file_types && (
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  File Types
                </p>
                <div className="flex flex-wrap gap-1">
                  {config.filters.file_types.map((type: string) => (
                    <span
                      key={type}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs"
                    >
                      {type.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {config.filters.keywords && (
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Keywords ({config.filters.keywords.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {config.filters.keywords.map((keyword: string) => (
                    <span
                      key={keyword}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full JSON */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Complete Configuration (JSON)
        </h3>
        <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs">
          <code className="text-gray-800 dark:text-gray-200">
            {JSON.stringify(config, null, 2)}
          </code>
        </pre>
      </div>
    </div>
  )
}
