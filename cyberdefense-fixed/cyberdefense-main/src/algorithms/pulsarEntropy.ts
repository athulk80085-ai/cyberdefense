// Pulsar Entropy System - MTD (Moving Target Defense) reshuffle engine
// Core principle: "Make the network topology impossible to map for more than 30 seconds"

export interface PulsarConfig {
  baseInterval: number // Base interval in milliseconds (default: 30000ms = 30s)
  jitterRange: number // Jitter range in milliseconds (default: 10000ms = ±5s)
  entropyThreshold: number // Threshold for entropy spike (default: 0.7)
  deterministicSeed?: number // For reproducible demos
}

export interface PulsarState {
  isRunning: boolean
  lastReshuffleTime: number
  nextReshuffleTime: number
  entropyLevel: number // 0-1 scale
  reshuffleCount: number
  currentTimerId?: NodeJS.Timeout
  config: PulsarConfig
}

export interface ReshuffleEvent {
  id: string
  timestamp: number
  entropyLevel: number
  reshuffleType: 'scheduled' | 'manual' | 'emergency'
  changes: {
    nodeRepositions: number
    connectionsModified: number
    trustAdjustments: number
  }
  duration: number // How long the reshuffle took
}

export interface PulsarCallbacks {
  onReshuffle: (event: ReshuffleEvent) => void
  onEntropySpike: (level: number) => void
  onTimerUpdate: (nextReshuffle: number, progress: number) => void
}

export class PulsarEntropy {
  private state: PulsarState
  private callbacks: PulsarCallbacks
  private randomGenerator: () => number

  constructor(
    config: Partial<PulsarConfig> = {},
    callbacks: PulsarCallbacks = {
      onReshuffle: () => {},
      onEntropySpike: () => {},
      onTimerUpdate: () => {}
    }
  ) {
    this.state = {
      isRunning: false,
      lastReshuffleTime: Date.now(),
      nextReshuffleTime: Date.now() + this.calculateNextInterval(30000),
      entropyLevel: 0.1, // Start with low entropy
      reshuffleCount: 0,
      config: {
        baseInterval: 30000,
        jitterRange: 10000,
        entropyThreshold: 0.7,
        ...config
      }
    }

    this.callbacks = callbacks

    // Set up random generator (deterministic if seed provided)
    if (config.deterministicSeed !== undefined) {
      let seed = config.deterministicSeed
      this.randomGenerator = () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    } else {
      this.randomGenerator = Math.random
    }
  }

  /**
   * Calculate the next interval with jitter
   */
  private calculateNextInterval(baseInterval?: number): number {
    const interval = baseInterval ?? this.state.config.baseInterval
    const jitter = (this.randomGenerator() - 0.5) * this.state.config.jitterRange
    return Math.max(10000, interval + jitter) // Minimum 10 seconds
  }

  /**
   * Calculate entropy level based on various factors
   */
  private calculateEntropyLevel(): number {
    const timeSinceLastReshuffle = Date.now() - this.state.lastReshuffleTime
    const progressToNext = timeSinceLastReshuffle /
      (this.state.nextReshuffleTime - this.state.lastReshuffleTime)

    // Entropy increases over time and with reshuffle count
    const timeEntropy = progressToNext * 0.6
    const reshuffleEntropy = Math.min(0.3, this.state.reshuffleCount * 0.05)
    const randomNoise = this.randomGenerator() * 0.1

    return Math.min(1, timeEntropy + reshuffleEntropy + randomNoise)
  }

  /**
   * Start the Pulsar entropy timer system
   */
  start(): void {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.scheduleNextReshuffle()

    // Start entropy monitoring
    this.startEntropyMonitoring()
  }

  /**
   * Stop the Pulsar entropy timer system
   */
  stop(): void {
    this.state.isRunning = false

    if (this.state.currentTimerId) {
      clearTimeout(this.state.currentTimerId)
      this.state.currentTimerId = undefined
    }
  }

  /**
   * Schedule the next reshuffle event
   */
  private scheduleNextReshuffle(): void {
    if (!this.state.isRunning) return

    const delay = this.calculateNextInterval()
    const nextReshuffleTime = Date.now() + delay

    this.state.nextReshuffleTime = nextReshuffleTime

    this.state.currentTimerId = setTimeout(() => {
      this.executeReshuffle('scheduled')
    }, delay)
  }

  /**
   * Execute a reshuffle event
   */
  private executeReshuffle(type: 'scheduled' | 'manual' | 'emergency'): void {
    const startTime = Date.now()

    // Update entropy level for this reshuffle
    this.state.entropyLevel = this.calculateEntropyLevel()

    const reshuffleEvent: ReshuffleEvent = {
      id: this.generateReshuffleId(),
      timestamp: startTime,
      entropyLevel: this.state.entropyLevel,
      reshuffleType: type,
      changes: {
        nodeRepositions: 0,
        connectionsModified: 0,
        trustAdjustments: 0
      },
      duration: 0
    }

    // Trigger entropy spike if above threshold
    if (this.state.entropyLevel >= this.state.config.entropyThreshold) {
      this.callbacks.onEntropySpike(this.state.entropyLevel)
    }

    // Calculate reshuffle changes (this would integrate with the simulation)
    const changes = this.calculateReshuffleChanges()

    reshuffleEvent.changes = changes

    const endTime = Date.now()
    reshuffleEvent.duration = endTime - startTime

    // Update state
    this.state.lastReshuffleTime = endTime
    this.state.reshuffleCount++
    this.state.entropyLevel = 0.1 // Reset entropy after reshuffle

    // Schedule next reshuffle
    this.scheduleNextReshuffle()

    // Trigger callback
    this.callbacks.onReshuffle(reshuffleEvent)
  }

  /**
   * Calculate what changes will happen during reshuffle
   */
  private calculateReshuffleChanges(): {
    nodeRepositions: number
    connectionsModified: number
    trustAdjustments: number
  } {
    // These would be calculated based on the actual simulation state
    // For now, return simulated values based on entropy level
    const entropyMultiplier = this.state.entropyLevel

    return {
      nodeRepositions: Math.floor(entropyMultiplier * 10) + 2, // 2-12 nodes
      connectionsModified: Math.floor(entropyMultiplier * 8) + 1, // 1-9 connections
      trustAdjustments: Math.floor(entropyMultiplier * 5) // 0-5 trust adjustments
    }
  }

  /**
   * Start monitoring entropy levels
   */
  private startEntropyMonitoring(): void {
    const monitorEntropy = () => {
      if (!this.state.isRunning) return

      const newEntropyLevel = this.calculateEntropyLevel()
      const oldEntropyLevel = this.state.entropyLevel
      this.state.entropyLevel = newEntropyLevel

      // Update timer progress
      const now = Date.now()
      const totalInterval = this.state.nextReshuffleTime - this.state.lastReshuffleTime
      const elapsed = now - this.state.lastReshuffleTime
      const progress = Math.min(1, elapsed / totalInterval)

      this.callbacks.onTimerUpdate(this.state.nextReshuffleTime, progress)

      // Continue monitoring
      setTimeout(monitorEntropy, 1000) // Update every second
    }

    monitorEntropy()
  }

  /**
   * Manually trigger an emergency reshuffle
   */
  triggerEmergencyReshuffle(): void {
    if (!this.state.isRunning) return

    // Cancel any pending reshuffle
    if (this.state.currentTimerId) {
      clearTimeout(this.state.currentTimerId)
      this.state.currentTimerId = undefined
    }

    // Execute emergency reshuffle
    this.executeReshuffle('emergency')
  }

  /**
   * Manually trigger a reshuffle
   */
  triggerManualReshuffle(): void {
    if (!this.state.isRunning) return

    // Cancel any pending reshuffle
    if (this.state.currentTimerId) {
      clearTimeout(this.state.currentTimerId)
      this.state.currentTimerId = undefined
    }

    // Execute manual reshuffle
    this.executeReshuffle('manual')
  }

  /**
   * Get current pulsar state
   */
  getState(): PulsarState {
    return { ...this.state }
  }

  /**
   * Get time until next reshuffle
   */
  getTimeUntilNextReshuffle(): number {
    return Math.max(0, this.state.nextReshuffleTime - Date.now())
  }

  /**
   * Get progress to next reshuffle (0-1 scale)
   */
  getProgressToNextReshuffle(): number {
    const now = Date.now()
    const totalInterval = this.state.nextReshuffleTime - this.state.lastReshuffleTime
    const elapsed = now - this.state.lastReshuffleTime
    return Math.min(1, Math.max(0, elapsed / totalInterval))
  }

  /**
   * Update pulsar configuration
   */
  updateConfig(config: Partial<PulsarConfig>): void {
    this.state.config = { ...this.state.config, ...config }

    // If deterministic seed changed, update random generator
    if (config.deterministicSeed !== undefined) {
      let seed = config.deterministicSeed
      this.randomGenerator = () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
    }
  }

  /**
   * Generate unique reshuffle ID
   */
  private generateReshuffleId(): string {
    return `reshuffle_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }

  /**
   * Get reshuffle statistics
   */
  getStatistics(): {
    totalReshuffles: number
    averageInterval: number
    entropyTrend: 'increasing' | 'decreasing' | 'stable'
    nextReshuffleIn: number
  } {
    // Simplified statistics - in a real implementation, we'd track history
    return {
      totalReshuffles: this.state.reshuffleCount,
      averageInterval: this.state.config.baseInterval,
      entropyTrend: this.state.entropyLevel > 0.5 ? 'increasing' : 'stable',
      nextReshuffleIn: this.getTimeUntilNextReshuffle()
    }
  }
}

/**
 * Convenience function to create a PulsarEntropy instance with default callbacks
 */
export function createPulsarEntropy(
  config?: Partial<PulsarConfig>,
  callbacks?: Partial<PulsarCallbacks>
): PulsarEntropy {
  const defaultCallbacks: PulsarCallbacks = {
    onReshuffle: (event) => {
      console.log(`[Pulsar] Reshuffle executed:`, {
        type: event.reshuffleType,
        entropy: event.entropyLevel.toFixed(3),
        changes: event.changes,
        duration: `${event.duration}ms`
      })
    },
    onEntropySpike: (level) => {
      console.warn(`[Pulsar] Entropy spike detected: ${(level * 100).toFixed(1)}%`)
    },
    onTimerUpdate: (nextReshuffle, progress) => {
      // Silent by default - UI components can override this
    }
  }

  return new PulsarEntropy(
    config,
    { ...defaultCallbacks, ...callbacks }
  )
}

/**
 * Utility function to calculate next drip time
 */
export function calculateNextDrip(
  baseInterval: number = 30000,
  jitterRange: number = 10000,
  deterministicSeed?: number
): number {
  if (deterministicSeed !== undefined) {
    let seed = deterministicSeed
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const jitter = (random() - 0.5) * jitterRange
    return baseInterval + jitter
  } else {
    const jitter = (Math.random() - 0.5) * jitterRange
    return baseInterval + jitter
  }
}