'use client';

/**
 * Bulk Actions Component
 *
 * Provides batch operations for selected crawl jobs:
 * - Pause/Resume all
 * - Cancel all
 * - Delete all
 * - Download all (ZIP)
 * - Export to CSV/JSON
 */

import { useState } from 'react';
import {
  Pause,
  Play,
  XCircle,
  Trash2,
  Download,
  FileText,
  FileJson,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { showToast } from '@/lib/toast';

interface BulkActionsProps {
  selectedIds: string[];
  onPause?: (ids: string[]) => Promise<void>;
  onResume?: (ids: string[]) => Promise<void>;
  onCancel?: (ids: string[]) => Promise<void>;
  onDelete?: (ids: string[]) => Promise<void>;
  onDownload?: (ids: string[], format: 'json' | 'jsonl' | 'csv' | 'zip') => Promise<void>;
  onClearSelection?: () => void;
  className?: string;
}

export function BulkActions({
  selectedIds,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onDownload,
  onClearSelection,
  className = '',
}: BulkActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    action: 'delete' | 'cancel';
    count: number;
  } | null>(null);

  if (selectedIds.length === 0) {
    return null;
  }

  const handleAction = async (
    action: string,
    handler?: (ids: string[]) => Promise<void>
  ) => {
    if (!handler) return;

    setIsLoading(action);
    try {
      await handler(selectedIds);
      showToast.success(`Successfully ${action}d ${selectedIds.length} job(s)`);
      onClearSelection?.();
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      showToast.error(`Failed to ${action} jobs`);
    } finally {
      setIsLoading(null);
    }
  };

  const handleDelete = () => {
    setConfirmAction({ action: 'delete', count: selectedIds.length });
  };

  const handleCancel = () => {
    setConfirmAction({ action: 'cancel', count: selectedIds.length });
  };

  const confirmActionHandler = async () => {
    if (!confirmAction) return;

    const handler = confirmAction.action === 'delete' ? onDelete : onCancel;
    await handleAction(confirmAction.action, handler);
    setConfirmAction(null);
  };

  return (
    <>
      <div
        className={`
          flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20
          border border-blue-200 dark:border-blue-800 rounded-lg
          animate-fadeIn
          ${className}
        `}
      >
        {/* Selection info */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {selectedIds.length} job{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClearSelection}
            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded transition-colors"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-blue-200 dark:bg-blue-700" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Pause */}
          {onPause && (
            <button
              onClick={() => handleAction('pause', onPause)}
              disabled={isLoading !== null}
              className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isLoading === 'pause' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              Pause All
            </button>
          )}

          {/* Resume */}
          {onResume && (
            <button
              onClick={() => handleAction('resume', onResume)}
              disabled={isLoading !== null}
              className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isLoading === 'resume' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Resume All
            </button>
          )}

          {/* Cancel */}
          {onCancel && (
            <button
              onClick={handleCancel}
              disabled={isLoading !== null}
              className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
            >
              {isLoading === 'cancel' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Cancel All
            </button>
          )}

          {/* Delete */}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isLoading !== null}
              className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {isLoading === 'delete' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete All
            </button>
          )}

          <div className="h-6 w-px bg-blue-200 dark:bg-blue-700" />

          {/* Download options */}
          {onDownload && (
            <>
              <button
                onClick={() =>
                  handleAction('download', () => onDownload(selectedIds, 'zip'))
                }
                disabled={isLoading !== null}
                className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading === 'download' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download (ZIP)
              </button>

              <div className="relative group">
                <button
                  disabled={isLoading !== null}
                  className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  Export
                </button>
                <div className="absolute top-full mt-1 right-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px] z-10">
                  <button
                    onClick={() =>
                      handleAction('export', () => onDownload(selectedIds, 'csv'))
                    }
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    CSV
                  </button>
                  <button
                    onClick={() =>
                      handleAction('export', () => onDownload(selectedIds, 'json'))
                    }
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileJson className="w-4 h-4" />
                    JSON
                  </button>
                  <button
                    onClick={() =>
                      handleAction('export', () => onDownload(selectedIds, 'jsonl'))
                    }
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileJson className="w-4 h-4" />
                    JSONL
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 animate-fadeIn">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm {confirmAction.action === 'delete' ? 'Deletion' : 'Cancellation'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to{' '}
              {confirmAction.action === 'delete' ? 'delete' : 'cancel'}{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {confirmAction.count}
              </span>{' '}
              job{confirmAction.count > 1 ? 's' : ''}?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmActionHandler}
                disabled={isLoading !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {confirmAction.action === 'delete' ? 'Delete' : 'Cancel'} Jobs
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BulkActions;
