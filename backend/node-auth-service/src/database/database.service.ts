import { Injectable, OnModuleInit, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private client: MongoClient;
  private db: Db;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async onModuleInit() {
    const endpoint = process.env.COSMOS_ENDPOINT || 'mongodb://localhost:27017';
    const dbName = process.env.COSMOS_DATABASE || 'amicis';

    this.logger.log(`Connecting to database: ${endpoint}`, 'DatabaseService');

    try {
      this.client = new MongoClient(endpoint);
      await this.client.connect();
      this.db = this.client.db(dbName);
      this.logger.log('Database connected successfully', 'DatabaseService');
    } catch (error) {
      this.logger.error(`Failed to connect to database: ${error.message}`, error.stack, 'DatabaseService');
      throw error;
    }
  }

  getDatabase(): Db {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      this.logger.log('Database connection closed', 'DatabaseService');
    }
  }
}
