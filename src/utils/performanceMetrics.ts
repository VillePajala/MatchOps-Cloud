'use client';

import logger from '@/utils/logger';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

export interface ModalPerformanceMetrics {
  newGameModal: {
    openToInteractive: number | null;
    openToHydrated: number | null;
    cacheHitRate: number | null;
    lastMeasured: number | null;
  };
  loadGameModal: {
    openToInteractive: number | null;
    lastMeasured: number | null;
  };
  supabaseWarmup: {
    duration: number | null;
    lastMeasured: number | null;
  };
}

export class PerformanceMetricsCollector {
  private metrics: ModalPerformanceMetrics = {
    newGameModal: {
      openToInteractive: null,
      openToHydrated: null,
      cacheHitRate: null,
      lastMeasured: null,
    },
    loadGameModal: {
      openToInteractive: null,
      lastMeasured: null,
    },
    supabaseWarmup: {
      duration: null,
      lastMeasured: null,
    },
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.collectMetrics();
      // Collect metrics every 5 seconds
      setInterval(() => this.collectMetrics(), 5000);
    }
  }

  private collectMetrics() {
    if (typeof performance === 'undefined' || !performance.getEntriesByType) {
      return;
    }

    try {
      const measures = performance.getEntriesByType('measure') as PerformanceMeasure[];
      
      // Collect New Game Modal metrics
      const newGameInteractive = measures.find(m => m.name === 'new-game-modal-interactive-time');
      if (newGameInteractive) {
        this.metrics.newGameModal.openToInteractive = newGameInteractive.duration;
        this.metrics.newGameModal.lastMeasured = Date.now();
      }

      const gameCreationData = measures.find(m => m.name === 'game-creation-data-duration');
      if (gameCreationData) {
        this.metrics.newGameModal.openToHydrated = gameCreationData.duration;
      }

      // Collect Load Game Modal metrics
      const loadGameInteractive = measures.find(m => m.name === 'load-game-modal-interactive');
      if (loadGameInteractive) {
        this.metrics.loadGameModal.openToInteractive = loadGameInteractive.duration;
        this.metrics.loadGameModal.lastMeasured = Date.now();
      }

      // Collect Supabase warmup metrics
      const supabaseWarmup = measures.find(m => m.name === 'supabase-warmup-duration');
      if (supabaseWarmup) {
        this.metrics.supabaseWarmup.duration = supabaseWarmup.duration;
        this.metrics.supabaseWarmup.lastMeasured = Date.now();
      }

      // Get cache hit rate from localStorage or session storage if available
      const cacheStats = this.getCacheStats();
      if (cacheStats) {
        this.metrics.newGameModal.cacheHitRate = cacheStats.hitRate;
      }

      logger.debug('[PerformanceMetrics] Collected metrics:', this.metrics);
    } catch (error) {
      logger.error('[PerformanceMetrics] Error collecting metrics:', error);
    }
  }

  private getCacheStats(): { hitRate: number } | null {
    try {
      // This would be set by useGameCreationData hook
      const stats = sessionStorage.getItem('gameCreationCacheStats');
      if (stats) {
        return JSON.parse(stats);
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  public getMetrics(): ModalPerformanceMetrics {
    return { ...this.metrics };
  }

  public clearMetrics() {
    if (typeof performance !== 'undefined' && performance.clearMeasures) {
      performance.clearMeasures();
    }
  }

  public recordCacheHitRate(rate: number) {
    this.metrics.newGameModal.cacheHitRate = rate;
    try {
      sessionStorage.setItem('gameCreationCacheStats', JSON.stringify({ hitRate: rate }));
    } catch {
      // Ignore storage errors
    }
  }
}

// Export singleton instance
export const performanceMetrics = new PerformanceMetricsCollector();