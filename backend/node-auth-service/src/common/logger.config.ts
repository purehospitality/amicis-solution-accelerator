import { WinstonModule, WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

export const getWinstonConfig = (): WinstonModuleOptions => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      nodeEnv === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
              return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${metaStr}`;
            })
          )
    ),
    transports: [
      new winston.transports.Console(),
    ],
  };
};

export const createLogger = () => {
  return WinstonModule.createLogger(getWinstonConfig());
};
