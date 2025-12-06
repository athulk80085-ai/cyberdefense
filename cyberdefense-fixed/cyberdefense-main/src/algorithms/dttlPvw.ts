// DTTL + PVW - Dynamic Token TTL and Path Validity Window logic
// Core principle: "Short TTL kills replay attacks by design"

import { Connection } from '../store/simulationStore'

export interface TokenConfig {
  baseDTTL: number // Base Dynamic TTL in seconds (default: 45s)
  minTTL: number // Minimum TTL in seconds (default: 5s)
  maxTTL: number // Maximum TTL in seconds (default: 300s = 5min)
  threatLevelMultiplier: number // How much threat level affects TTL (default: 0.5)
  stabilityFactor: number // How connection stability affects TTL (default: 0.3)
}

export interface TokenInfo {
  id: string
  path: string[] // Array of node IDs
  issuedAt: number
  expiresAt: number
  dttl: number
  pvw: number // Path Validity Window
  trustLevel: number // 0-1 scale
  threatLevel: number // 0-1 scale
  isActive: boolean
  isValid: boolean
}

export interface PathAnalysis {
  path: string[]
  connections: Connection[]
  baseTTL: number
  linkTTLs: number[]
  pvw: number
  trustScore: number
  stabilityScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommendations: string[]
}

export interface ThreatMetrics {
  attackDensity: number // Attacks per minute
  networkInstability: number // 0-1 scale
  trustDegradation: number // 0-1 scale
  anomalyRate: number // Anomalies per minute
}

export class DTTLManager {
  private config: TokenConfig
  private activeTokens: Map<string, TokenInfo> = new Map()
  private threatMetrics: ThreatMetrics = {
    attackDensity: 0,
    networkInstability: 0,
    trustDegradation: 0,
    anomalyRate: 0
  }

  constructor(config: Partial<TokenConfig> = {}) {
    this.config = {
      baseDTTL: 45,
      minTTL: 5,
      maxTTL: 300,
      threatLevelMultiplier: 0.5,
      stabilityFactor: 0.3,
      ...config
    }
  }

  /**
   * Calculate Path Validity Window (PVW) for a given path
   * PVW = min(DTTL, all link TTLs in the path)
   */
  computePVW(path: Connection[], dttl: number): number {
    if (path.length === 0) return dttl

    const pathTTLs = path.map(link => link.ttl)
    const minLinkTTL = Math.min(...pathTTLs)

    return Math.min(dttl, minLinkTTL)
  }

  /**
   * Analyze a path and calculate security metrics
   */
  analyzePath(
    nodePath: string[],
    connections: Connection[],
    currentTrustScores: Map<string, number>
  ): PathAnalysis {
    // Find connections that make up this path
    const pathConnections: Connection[] = []

    for (let i = 0; i < nodePath.length - 1; i++) {
      const fromNode = nodePath[i]
      const toNode = nodePath[i + 1]

      const connection = connections.find(
        conn => (conn.from === fromNode && conn.to === toNode) ||
                (conn.from === toNode && conn.to === fromNode)
      )

      if (connection) {
        pathConnections.push(connection)
      }
    }

    // Calculate path metrics
    const linkTTLs = pathConnections.map(conn => conn.ttl)
    const baseTTL = this.config.baseDTTL
    const pvw = this.computePVW(pathConnections, baseTTL)

    // Calculate trust score (minimum trust along path)
    let minTrust = 1
    nodePath.forEach(nodeId => {
      const nodeTrust = currentTrustScores.get(nodeId) || 0
      minTrust = Math.min(minTrust, nodeTrust)
    })

    // Consider connection trust levels
    pathConnections.forEach(conn => {
      minTrust = Math.min(minTrust, conn.trust)
    })

    // Calculate stability score (average stability of connections)
    const stabilityScore = pathConnections.length > 0 ?
      pathConnections.reduce((sum, conn) => sum + conn.stability, 0) / pathConnections.length :
      1

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(minTrust, stabilityScore, pvw)

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      riskLevel,
      minTrust,
      stabilityScore,
      pvw
    )

    return {
      path: nodePath,
      connections: pathConnections,
      baseTTL,
      linkTTLs,
      pvw,
      trustScore: minTrust,
      stabilityScore,
      riskLevel,
      recommendations
    }
  }

  /**
   * Calculate risk level based on path metrics
   */
  private calculateRiskLevel(
    trustScore: number,
    stabilityScore: number,
    pvw: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const riskScore = (1 - trustScore) * 0.4 + // 40% weight on trust
                      (1 - stabilityScore) * 0.3 + // 30% weight on stability
                      (1 - pvw / this.config.baseDTTL) * 0.3 // 30% weight on TTL

    if (riskScore < 0.2) return 'LOW'
    if (riskScore < 0.4) return 'MEDIUM'
    if (riskScore < 0.7) return 'HIGH'
    return 'CRITICAL'
  }

  /**
   * Generate security recommendations for a path
   */
  private generateRecommendations(
    riskLevel: string,
    trustScore: number,
    stabilityScore: number,
    pvw: number
  ): string[] {
    const recommendations: string[] = []

    if (trustScore < 0.7) {
      recommendations.push('Path includes low-trust nodes - consider alternative route')
    }

    if (stabilityScore < 0.6) {
      recommendations.push('Path includes unstable connections - monitor closely')
    }

    if (pvw < 15) {
      recommendations.push('Short validity window - may impact performance')
    }

    if (pvw < 5) {
      recommendations.push('Very short TTL - risk of timeouts')
    }

    if (riskLevel === 'CRITICAL') {
      recommendations.push('CRITICAL: Path not recommended for secure communications')
    }

    if (recommendations.length === 0) {
      recommendations.push('Path appears secure for use')
    }

    return recommendations
  }

  /**
   * Update TTL based on current threat level
   */
  updateTTLBasedOnThreat(baseTTL: number, threatLevel: number): number {
    const reductionFactor = Math.max(0.1, 1 - (threatLevel * this.config.threatLevelMultiplier))
    const newTTL = baseTTL * reductionFactor

    // Clamp to min/max values
    return Math.max(this.config.minTTL, Math.min(this.config.maxTTL, newTTL))
  }

  /**
   * Generate a new token for a path
   */
  generateToken(
    path: string[],
    connections: Connection[],
    currentTrustScores: Map<string, number>,
    customDTTL?: number
  ): TokenInfo {
    const pathAnalysis = this.analyzePath(path, connections, currentTrustScores)

    // Calculate DTTL based on threat level and path analysis
    const baseDTTL = customDTTL || this.config.baseDTTL
    const threatAdjustedDTTL = this.updateTTLBasedOnThreat(
      baseDTTL,
      this.threatMetrics.attackDensity
    )

    // Apply stability factor
    const stabilityAdjustedDTTL = threatAdjustedDTTL *
      (1 + (pathAnalysis.stabilityScore - 1) * this.config.stabilityFactor)

    // Final DTTL
    const dttl = Math.max(this.config.minTTL, stabilityAdjustedDTTL)

    // Calculate PVW
    const pvw = this.computePVW(pathAnalysis.connections, dttl)

    const now = Date.now()
    const token: TokenInfo = {
      id: this.generateTokenId(),
      path,
      issuedAt: now,
      expiresAt: now + (pvw * 1000), // Convert to milliseconds
      dttl,
      pvw,
      trustLevel: pathAnalysis.trustScore,
      threatLevel: this.calculatePathThreatLevel(pathAnalysis),
      isActive: true,
      isValid: true
    }

    this.activeTokens.set(token.id, token)

    return token
  }

  /**
   * Calculate threat level for a specific path
   */
  private calculatePathThreatLevel(pathAnalysis: PathAnalysis): number {
    let threatLevel = 0

    // Base threat from risk level
    switch (pathAnalysis.riskLevel) {
      case 'CRITICAL': threatLevel += 0.8; break
      case 'HIGH': threatLevel += 0.6; break
      case 'MEDIUM': threatLevel += 0.3; break
      case 'LOW': threatLevel += 0.1; break
    }

    // Add global threat metrics
    threatLevel = Math.max(threatLevel, this.threatMetrics.attackDensity)
    threatLevel = Math.max(threatLevel, this.threatMetrics.networkInstability)
    threatLevel = Math.max(threatLevel, this.threatMetrics.trustDegradation)

    return Math.min(1, threatLevel)
  }

  /**
   * Validate a token
   */
  validateToken(tokenId: string): { isValid: boolean; reason?: string } {
    const token = this.activeTokens.get(tokenId)

    if (!token) {
      return { isValid: false, reason: 'Token not found' }
    }

    if (!token.isActive) {
      return { isValid: false, reason: 'Token is inactive' }
    }

    if (!token.isValid) {
      return { isValid: false, reason: 'Token is invalid' }
    }

    if (Date.now() > token.expiresAt) {
      // Mark token as expired
      token.isActive = false
      token.isValid = false
      return { isValid: false, reason: 'Token expired' }
    }

    return { isValid: true }
  }

  /**
   * Revoke a token
   */
  revokeToken(tokenId: string, reason?: string): boolean {
    const token = this.activeTokens.get(tokenId)

    if (!token) return false

    token.isActive = false
    token.isValid = false

    return true
  }

  /**
   * Update global threat metrics
   */
  updateThreatMetrics(metrics: Partial<ThreatMetrics>): void {
    this.threatMetrics = { ...this.threatMetrics, ...metrics }

    // Adjust existing tokens if threat level increased significantly
    if (metrics.attackDensity !== undefined && metrics.attackDensity > 0.5) {
      this.adjustExistingTokensForHighThreat()
    }
  }

  /**
   * Adjust existing tokens when threat level increases
   */
  private adjustExistingTokensForHighThreat(): void {
    const now = Date.now()

    this.activeTokens.forEach(token => {
      if (!token.isActive) return

      const remainingTime = (token.expiresAt - now) / 1000

      // If token has significant remaining time, reduce it
      if (remainingTime > token.pvw * 0.5) {
        const newRemainingTime = remainingTime * 0.7 // Reduce by 30%
        token.expiresAt = now + (newRemainingTime * 1000)
        token.pvw = newRemainingTime
        token.threatLevel = Math.min(1, token.threatLevel + 0.2)
      }
    })
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens(): number {
    let cleanedCount = 0
    const now = Date.now()

    this.activeTokens.forEach((token, tokenId) => {
      if (now > token.expiresAt) {
        token.isActive = false
        token.isValid = false
        cleanedCount++
      }
    })

    return cleanedCount
  }

  /**
   * Get statistics about active tokens
   */
  getTokenStatistics(): {
    totalTokens: number
    activeTokens: number
    expiredTokens: number
    averagePVW: number
    averageTrustLevel: number
    threatDistribution: {
      low: number
      medium: number
      high: number
      critical: number
    }
  } {
    const activeTokens = Array.from(this.activeTokens.values()).filter(t => t.isActive)

    const totalTokens = this.activeTokens.size
    const expiredTokens = totalTokens - activeTokens.length

    const averagePVW = activeTokens.length > 0 ?
      activeTokens.reduce((sum, token) => sum + token.pvw, 0) / activeTokens.length :
      0

    const averageTrustLevel = activeTokens.length > 0 ?
      activeTokens.reduce((sum, token) => sum + token.trustLevel, 0) / activeTokens.length :
      0

    const threatDistribution = {
      low: activeTokens.filter(t => t.threatLevel < 0.3).length,
      medium: activeTokens.filter(t => t.threatLevel >= 0.3 && t.threatLevel < 0.6).length,
      high: activeTokens.filter(t => t.threatLevel >= 0.6 && t.threatLevel < 0.8).length,
      critical: activeTokens.filter(t => t.threatLevel >= 0.8).length
    }

    return {
      totalTokens,
      activeTokens: activeTokens.length,
      expiredTokens,
      averagePVW,
      averageTrustLevel,
      threatDistribution
    }
  }

  /**
   * Get current threat metrics
   */
  getThreatMetrics(): ThreatMetrics {
    return { ...this.threatMetrics }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TokenConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Generate unique token ID
   */
  private generateTokenId(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }
}

/**
 * Convenience function to create a DTTLManager with default configuration
 */
export function createDTTLManager(config?: Partial<TokenConfig>): DTTLManager {
  return new DTTLManager(config)
}

/**
 * Utility function to calculate PVW for a simple path
 */
export function computePVW(path: Connection[], dttl: number): number {
  if (path.length === 0) return dttl

  const pathTTLs = path.map(link => link.ttl)
  return Math.min(dttl, ...pathTTLs)
}

/**
 * Utility function to update TTL based on threat
 */
export function updateTTLBasedOnThreat(
  baseTTL: number,
  threatLevel: number,
  multiplier: number = 0.5
): number {
  const reductionFactor = Math.max(0.1, 1 - (threatLevel * multiplier))
  return baseTTL * reductionFactor
}