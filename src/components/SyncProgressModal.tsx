'use client';

import { useSyncProgress } from '@/hooks/useSyncProgress';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncProgressModal = ({ isOpen, onClose }: SyncProgressModalProps) => {
  const { 
    operations, 
    isActive, 
    overallProgress, 
    lastSync, 
    pendingCount, 
    failedCount,
    clearCompleted,
    retryFailed 
  } = useSyncProgress();
  
  const { isOnline, isSupabaseReachable, connectionQuality } = useConnectionStatus();

  if (!isOpen) return null;

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getOperationIcon = (type?: string, status?: string) => {
    if (status === 'syncing') return '🔄';
    if (status === 'completed') return '✅';
    if (status === 'failed') return '❌';
    if (type === 'upload') return '⬆️';
    if (type === 'download') return '⬇️';
    if (type === 'conflict_resolve') return '⚡';
    return '📝';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      case 'syncing': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const recentOperations = (operations || [])
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  return (
    <div role="dialog" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sync Status
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="sr-only">Close</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Connection Status */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Connection Status
            </h3>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isOnline && isSupabaseReachable ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? (isSupabaseReachable ? '🟢 Online' : '🟡 Server unreachable') : '🔴 Offline'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Connection Quality:</span>
              <span className="ml-2 font-medium">{connectionQuality}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Last Sync:</span>
              <span className="ml-2 font-medium">
                {lastSync ? lastSync.toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Sync Progress */}
        {isActive && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Active Sync
              </h3>
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {Math.round(overallProgress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                role="progressbar"
                aria-valuenow={overallProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Summary
            </h3>
            <div className="flex gap-2">
              {failedCount > 0 && (
                <button
                  onClick={retryFailed}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  Retry Failed
                </button>
              )}
              <button
                onClick={clearCompleted}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Clear Completed
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(operations || []).filter(op => op.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {pendingCount}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {failedCount}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
            </div>
          </div>
        </div>

        {/* Recent Operations */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Operations
          </h3>
          <div className="max-h-64 overflow-y-auto">
            {recentOperations.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No sync operations yet
              </p>
            ) : (
              <div className="space-y-2">
                {recentOperations.map((operation) => (
                  <div 
                    key={operation.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {getOperationIcon(operation.type, operation.status)}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {(operation.type || 'unknown').replace('_', ' ')} - {operation.table || 'unknown'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTimestamp(operation.timestamp)}
                        </div>
                        {operation.error && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {operation.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getStatusColor(operation.status)}`}>
                        {operation.status}
                      </span>
                      {operation.status === 'syncing' && (
                        <div className="w-8 text-xs text-right">
                          {operation.progress}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};