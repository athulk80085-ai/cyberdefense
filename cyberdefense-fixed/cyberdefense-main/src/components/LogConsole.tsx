'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSimulationStore } from '../store/simulationStore'

// Log level configuration
const LOG_LEVELS = {
  INFO: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: 'ℹ️' },
  WARNING: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: '⚠️' },
  ERROR: { color: 'text-red-400', bg: 'bg-red-500/10', icon: '❌' },
  ATTACK: { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: '🎯' },
  SUCCESS: { color: 'text-green-400', bg: 'bg-green-500/10', icon: '✅' }
} as const

export function LogConsole() {
  const logs = useSimulationStore((state) => state.logs)
  const clearLogs = useSimulationStore((state) => state.clearLogs)
  const [filter, setFilter] = useState<string>('ALL')
  const [autoScroll, setAutoScroll] = useState(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Filter logs based on level and search term
  const filteredLogs = logs.filter(log => {
    const levelMatch = filter === 'ALL' || log.level === filter
    const searchMatch = !searchTerm ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase())
    return levelMatch && searchMatch
  })

  // Get unique log levels for filter
  const uniqueLevels = Array.from(new Set(logs.map(log => log.level)))

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  const handleExportLogs = () => {
    const logText = filteredLogs.map(log => {
      const timestamp = formatTimestamp(log.timestamp)
      return `[${timestamp}] [${log.level}] [${log.source}] ${log.message}`
    }).join('\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pos-logs-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-white">System Logs</h3>
          <div className="text-xs text-gray-400">
            {filteredLogs.length} / {logs.length} entries
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              autoScroll
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>

          {/* Export button */}
          <button
            onClick={handleExportLogs}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            Export
          </button>

          {/* Clear logs button */}
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10">
        {/* Level filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Level:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-2 py-1 text-xs bg-black/50 border border-white/20 rounded text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Levels</option>
            {uniqueLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1 text-xs bg-black/50 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {logs.length === 0 ? 'No logs available' : 'No logs match current filters'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => {
              const levelConfig = LOG_LEVELS[log.level as keyof typeof LOG_LEVELS] || LOG_LEVELS.INFO

              return (
                <div
                  key={log.id}
                  className={`group flex items-start gap-3 p-2 rounded transition-colors hover:bg-white/5 ${levelConfig.bg}`}
                >
                  {/* Timestamp */}
                  <div className="text-gray-500 font-mono whitespace-nowrap">
                    [{formatTimestamp(log.timestamp)}]
                  </div>

                  {/* Level indicator */}
                  <div className={`flex items-center gap-1 ${levelConfig.color} whitespace-nowrap`}>
                    <span>{levelConfig.icon}</span>
                    <span className="font-medium">{log.level}</span>
                  </div>

                  {/* Source */}
                  <div className="text-gray-400 whitespace-nowrap">
                    [{log.source}]
                  </div>

                  {/* Message */}
                  <div className="text-gray-300 flex-1">
                    {log.message}
                  </div>

                  {/* Details button (if available) */}
                  {log.details && (
                    <button
                      onClick={() => {
                        // Show details in a modal or expanded view
                        console.log('Log details:', log.details)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 transition-opacity"
                    >
                      Details
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer with statistics */}
      <div className="px-4 py-2 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>
            Total logs: {logs.length}
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(LOG_LEVELS).map(([level, config]) => {
              const count = logs.filter(log => log.level === level).length
              return (
                <div key={level} className="flex items-center gap-1">
                  <span>{config.icon}</span>
                  <span className={config.color}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}