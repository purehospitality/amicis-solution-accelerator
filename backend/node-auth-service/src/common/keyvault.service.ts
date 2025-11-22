import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export interface KeyVaultConfig {
  vaultUrl?: string;
  enabled: boolean;
}

@Injectable()
export class KeyVaultService implements OnModuleInit {
  private readonly logger = new Logger(KeyVaultService.name);
  private client: SecretClient | null = null;
  private secretCache = new Map<string, { value: string; expiresAt: number }>();
  private readonly cacheTtl = 5 * 60 * 1000; // 5 minutes
  private readonly enabled: boolean;

  constructor() {
    this.enabled = process.env.KEY_VAULT_ENABLED === 'true';
    
    if (this.enabled) {
      const vaultUrl = process.env.KEY_VAULT_URL;
      if (!vaultUrl) {
        this.logger.warn('KEY_VAULT_URL not configured, Key Vault integration disabled');
        this.enabled = false;
        return;
      }

      try {
        const credential = new DefaultAzureCredential();
        this.client = new SecretClient(vaultUrl, credential);
        this.logger.log(`Key Vault client initialized for ${vaultUrl}`);
      } catch (error) {
        this.logger.error('Failed to initialize Key Vault client', error);
        this.enabled = false;
      }
    } else {
      this.logger.log('Key Vault integration disabled');
    }
  }

  async onModuleInit() {
    if (this.enabled && this.client) {
      try {
        // Test connection by listing secrets (just to verify access)
        const iterator = this.client.listPropertiesOfSecrets();
        await iterator.next();
        this.logger.log('Key Vault connection verified');
      } catch (error) {
        this.logger.error('Key Vault connection test failed', error);
      }
    }
  }

  /**
   * Get a secret from Key Vault with caching
   */
  async getSecret(secretName: string, defaultValue?: string): Promise<string | undefined> {
    // If Key Vault is disabled, return environment variable or default
    if (!this.enabled) {
      return process.env[secretName] || defaultValue;
    }

    // Check cache first
    const cached = this.secretCache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Fetch from Key Vault
    try {
      const secret = await this.client!.getSecret(secretName);
      const value = secret.value || defaultValue;
      
      // Cache the secret
      if (value) {
        this.secretCache.set(secretName, {
          value,
          expiresAt: Date.now() + this.cacheTtl,
        });
      }
      
      this.logger.debug(`Retrieved secret: ${secretName}`);
      return value;
    } catch (error) {
      this.logger.error(`Failed to get secret ${secretName}:`, error);
      // Fallback to environment variable or default
      return process.env[secretName] || defaultValue;
    }
  }

  /**
   * Get multiple secrets at once
   */
  async getSecrets(secretNames: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    await Promise.all(
      secretNames.map(async (name) => {
        const value = await this.getSecret(name);
        if (value) {
          results[name] = value;
        }
      }),
    );
    
    return results;
  }

  /**
   * Clear the secret cache
   */
  clearCache(): void {
    this.secretCache.clear();
    this.logger.log('Secret cache cleared');
  }

  /**
   * Check if Key Vault is enabled and configured
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }
}
