import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const routeLookupErrors = new Counter('route_lookup_errors');
const routeLookupDuration = new Trend('route_lookup_duration');
const cacheHitRate = new Counter('cache_hit_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 200 }, // Spike to 200 users
    { duration: '1m', target: 200 },  // Stay at 200 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'], // 95% requests < 300ms, 99% < 500ms
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
    route_lookup_duration: ['p(95)<250'],           // 95% route lookups < 250ms
  },
};

// Environment variables with defaults
const BASE_URL = __ENV.ROUTING_SERVICE_URL || 'http://localhost:8080';
const JWT_TOKEN = __ENV.JWT_TOKEN || 'demo-jwt-token'; // Replace with actual token

// Test data - store IDs
const storeIds = [
  'IKEA001',
  'IKEA002',
  'IKEA003',
  'IKEA004',
  'IKEA005',
  'IKEA006',
  'IKEA007',
  'IKEA008',
  'IKEA009',
  'IKEA010',
];

export default function () {
  // Select a random store ID (simulates cache hits and misses)
  const storeId = storeIds[Math.floor(Math.random() * storeIds.length)];

  // Route lookup endpoint
  const routeUrl = `${BASE_URL}/api/v1/route?storeId=${storeId}`;
  const params = {
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'RouteLookup', storeId },
  };

  // Measure route lookup
  const startTime = new Date();
  const routeResponse = http.get(routeUrl, params);
  const duration = new Date() - startTime;

  routeLookupDuration.add(duration);

  // Check route lookup response
  const routeCheck = check(routeResponse, {
    'route lookup status is 200': (r) => r.status === 200,
    'route lookup has storeId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.storeId === storeId;
      } catch {
        return false;
      }
    },
    'route lookup has backendUrl': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.backendUrl !== undefined;
      } catch {
        return false;
      }
    },
    'route lookup has backendContext': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.backendContext !== undefined;
      } catch {
        return false;
      }
    },
    'route lookup response time < 300ms': (r) => r.timings.duration < 300,
  });

  if (!routeCheck) {
    routeLookupErrors.add(1);
  }

  // Track cache hits (inferred from response time)
  if (routeResponse.timings.duration < 50) {
    cacheHitRate.add(1);
  }

  // Health check endpoint (public, no auth required)
  const healthUrl = `${BASE_URL}/health`;
  const healthResponse = http.get(healthUrl, {
    tags: { name: 'HealthCheck' },
  });

  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check has status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined;
      } catch {
        return false;
      }
    },
    'health check has dependencies': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.dependencies !== undefined;
      } catch {
        return false;
      }
    },
  });

  // Think time between requests
  sleep(Math.random() * 1.5 + 0.5); // 0.5-2 seconds
}

// Setup function (runs once per VU)
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  
  // Verify service is up
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Service not available: ${healthResponse.status}`);
  }
  
  console.log('Service health check passed');
  
  // Warm up cache with first few stores
  console.log('Warming up cache...');
  const warmupParams = {
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
    },
  };
  
  for (let i = 0; i < 5; i++) {
    http.get(`${BASE_URL}/api/v1/route?storeId=${storeIds[i]}`, warmupParams);
  }
  
  console.log('Cache warmup completed');
}

// Teardown function (runs once after all VUs finish)
export function teardown(data) {
  console.log('Load test completed');
}

// Handle summary for custom reporting
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  
  let summary = '\n';
  summary += `${indent}Summary:\n`;
  summary += `${indent}  Duration: ${data.metrics.iteration_duration.avg.toFixed(2)}ms avg\n`;
  summary += `${indent}  Requests: ${data.metrics.http_reqs.count}\n`;
  summary += `${indent}  Failures: ${data.metrics.http_req_failed.values.rate.toFixed(2)}%\n`;
  summary += `${indent}  P95 Response Time: ${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99 Response Time: ${data.metrics.http_req_duration['p(99)'].toFixed(2)}ms\n`;
  
  if (data.metrics.cache_hit_rate) {
    const cacheHits = data.metrics.cache_hit_rate.values.count;
    const totalRequests = data.metrics.http_reqs.count;
    const hitRate = ((cacheHits / totalRequests) * 100).toFixed(2);
    summary += `${indent}  Cache Hit Rate: ${hitRate}%\n`;
  }
  
  return summary;
}
