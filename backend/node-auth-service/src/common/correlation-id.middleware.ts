import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Try to get correlation ID from request headers
    let correlationId = req.headers[CORRELATION_ID_HEADER] as string;
    
    // Fallback to X-Request-ID if not present
    if (!correlationId) {
      correlationId = req.headers[REQUEST_ID_HEADER] as string;
    }
    
    // Generate new UUID if still not present
    if (!correlationId) {
      correlationId = uuidv4();
    }
    
    // Store in request object for later use
    req['correlationId'] = correlationId;
    
    // Add to response headers
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    
    next();
  }
}

// Extend Express Request type to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
