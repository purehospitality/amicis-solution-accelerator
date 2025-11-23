import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

export interface CircuitBreakerOptions {
  timeout?: number; // Timeout in milliseconds
  errorThresholdPercentage?: number; // Percentage of failures to trip circuit
  resetTimeout?: number; // Time in ms to attempt reset
  rollingCountTimeout?: number; // Time window for error percentage calculation
  rollingCountBuckets?: number; // Number of buckets in rolling window
  name?: string; // Circuit breaker name for logging
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Create or get a circuit breaker for a specific operation
   */
  getBreaker<T = any, A extends any[] = any[]>(
    name: string,
    action: (...args: A) => Promise<T>,
    options?: CircuitBreakerOptions,
  ): CircuitBreaker<A, T> {
    if (this.breakers.has(name)) {
      return this.breakers.get(name) as CircuitBreaker<A, T>;
    }

    const defaultOptions: CircuitBreakerOptions = {
      timeout: 3000, // 3 seconds
      errorThresholdPercentage: 50, // 50% errors trips circuit
      resetTimeout: 30000, // Try again after 30 seconds
      rollingCountTimeout: 10000, // 10 second window
      rollingCountBuckets: 10, // 10 buckets (1 second each)
      name,
    };

    const breakerOptions = { ...defaultOptions, ...options };
    const breaker = new CircuitBreaker(action, breakerOptions);

    // Event listeners for monitoring
    breaker.on('open', () => {
      this.logger.warn(`Circuit breaker '${name}' opened - requests will be rejected`);
    });

    breaker.on('halfOpen', () => {
      this.logger.log(`Circuit breaker '${name}' half-open - testing if service recovered`);
    });

    breaker.on('close', () => {
      this.logger.log(`Circuit breaker '${name}' closed - service recovered`);
    });

    breaker.on('failure', (error) => {
      this.logger.error(`Circuit breaker '${name}' recorded failure:`, error.message);
    });

    breaker.on('success', () => {
      this.logger.debug(`Circuit breaker '${name}' recorded success`);
    });

    breaker.on('timeout', () => {
      this.logger.warn(`Circuit breaker '${name}' timeout - operation took too long`);
    });

    breaker.on('reject', () => {
      this.logger.warn(`Circuit breaker '${name}' rejected request - circuit is open`);
    });

    breaker.on('fallback', (result) => {
      this.logger.log(`Circuit breaker '${name}' using fallback`, result);
    });

    this.breakers.set(name, breaker);
    return breaker as CircuitBreaker<A, T>;
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(
    name: string,
    action: () => Promise<T>,
    options?: CircuitBreakerOptions,
  ): Promise<T> {
    const breaker = this.getBreaker(name, action, options);
    return breaker.fire();
  }

  /**
   * Execute with fallback - if circuit is open or operation fails, use fallback
   */
  async executeWithFallback<T>(
    name: string,
    action: () => Promise<T>,
    fallback: (error?: Error) => T | Promise<T>,
    options?: CircuitBreakerOptions,
  ): Promise<T> {
    const breaker = this.getBreaker(name, action, options);
    breaker.fallback(fallback);
    return breaker.fire();
  }

  /**
   * Get statistics for all circuit breakers
   */
  getStats() {
    const stats: Record<string, any> = {};
    
    this.breakers.forEach((breaker, name) => {
      stats[name] = {
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: breaker.stats,
        enabled: breaker.enabled,
        warmUp: breaker.warmUp,
      };
    });

    return stats;
  }

  /**
   * Get statistics for a specific circuit breaker
   */
  getBreakerStats(name: string) {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      return null;
    }

    return {
      name,
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
      stats: breaker.stats,
      enabled: breaker.enabled,
      warmUp: breaker.warmUp,
    };
  }

  /**
   * Manually shutdown a circuit breaker
   */
  shutdown(name: string) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.shutdown();
      this.breakers.delete(name);
      this.logger.log(`Circuit breaker '${name}' shut down`);
    }
  }

  /**
   * Shutdown all circuit breakers
   */
  shutdownAll() {
    this.breakers.forEach((breaker, name) => {
      breaker.shutdown();
      this.logger.log(`Circuit breaker '${name}' shut down`);
    });
    this.breakers.clear();
  }
}
