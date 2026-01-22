'use client'

/**
 * Connection Status Indicator
 *
 * Shows WebSocket connection status in the corner of the screen.
 * Provides visual feedback for real-time updates availability.
 */

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'

interface ConnectionStatusProps {
  className?: string
  showDetails?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function ConnectionStatus({
  className = '',
  showDetails = false,
  position = 'bottom-right',
}: ConnectionStatusProps) {
  const { connected, connectionState } = useWebSocket({ autoConnect: true })
  const [isExpanded, setIsExpanded] = useState(false)
  const [reconnectCount, setReconnectCount] = useState(0)

  // Track reconnection attempts
  useEffect(() => {
    if (connectionState === 'reconnecting') {
      setReconnectCount(prev => prev + 1)
    }
    if (connectionState === 'connected') {
      setReconnectCount(0)
    }
  }, [connectionState])

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  }

  // Status configuration
  const statusConfig = {
    connected: {
      icon: Wifi,
      label: 'Connected',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-700',
      dotColor: 'bg-emerald-500',
      animate: true,
    },
    connecting: {
      icon: RefreshCw,
      label: 'Connecting...',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-700',
      dotColor: 'bg-amber-500',
      animate: true,
    },
    reconnecting: {
      icon: RefreshCw,
      label: `Reconnecting...${reconnectCount > 1 ? ` (${reconnectCount})` : ''}`,
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-700',
      dotColor: 'bg-orange-500',
      animate: true,
    },
    disconnected: {
      icon: WifiOff,
      label: 'Disconnected',
      bgColor: 'bg-rose-500/10',
      textColor: 'text-rose-700',
      dotColor: 'bg-rose-500',
      animate: false,
    },
    disconnecting: {
      icon: WifiOff,
      label: 'Disconnecting...',
      bgColor: 'bg-slate-500/10',
      textColor: 'text-slate-700',
      dotColor: 'bg-slate-500',
      animate: false,
    },
  }

  const config = statusConfig[connectionState]
  const Icon = config.icon

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 ${className}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg
          transition-all duration-300 cursor-pointer
          ${config.bgColor} ${config.textColor}
          ${isExpanded ? 'pr-4' : ''}
        `}
        role="status"
        aria-live="polite"
      >
        {/* Status dot */}
        <div className="relative">
          <div
            className={`w-2 h-2 rounded-full ${config.dotColor} ${
              config.animate ? 'animate-pulse' : ''
            }`}
          />
          {config.animate && (
            <div
              className={`absolute inset-0 w-2 h-2 rounded-full ${config.dotColor} animate-ping opacity-75`}
            />
          )}
        </div>

        {/* Icon */}
        <Icon
          className={`w-4 h-4 ${
            connectionState === 'connecting' || connectionState === 'reconnecting'
              ? 'animate-spin'
              : ''
          }`}
        />

        {/* Label (expanded or always visible) */}
        {(isExpanded || showDetails) && (
          <span className="text-sm font-medium whitespace-nowrap">
            {config.label}
          </span>
        )}
      </div>

      {/* Details panel (on hover) */}
      {isExpanded && showDetails && (
        <div
          className={`
            absolute mt-2 p-3 rounded-lg shadow-xl
            bg-[var(--gc-surface)]
            border border-[var(--gc-border)]
            ${position.includes('right') ? 'right-0' : 'left-0'}
            w-64
          `}
        >
          <h4 className="text-sm font-semibold text-[var(--gc-ink)] mb-2">
            Connection Details
          </h4>
          <div className="space-y-2 text-xs text-[var(--gc-muted)]">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={config.textColor}>{config.label}</span>
            </div>
            <div className="flex justify-between">
              <span>Real-time updates:</span>
              <span>{connected ? 'Enabled' : 'Disabled'}</span>
            </div>
            {reconnectCount > 0 && !connected && (
              <div className="flex justify-between">
                <span>Reconnect attempts:</span>
                <span>{reconnectCount}</span>
              </div>
            )}
          </div>
          {!connected && (
            <p className="mt-2 text-xs text-[var(--gc-muted)]">
              Data will update via polling until connection is restored.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Minimal inline connection indicator
 */
export function ConnectionIndicator({
  className = '',
}: {
  className?: string
}) {
  const { connected, connectionState } = useWebSocket({ autoConnect: true })

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      title={`WebSocket: ${connectionState}`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          connected
            ? 'bg-green-500 animate-pulse'
            : connectionState === 'reconnecting'
            ? 'bg-orange-500 animate-pulse'
            : 'bg-red-500'
        }`}
      />
      <span className="text-xs text-[var(--gc-muted)]">
        {connected ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}

export default ConnectionStatus
