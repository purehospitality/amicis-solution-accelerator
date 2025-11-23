import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const tokenExchangeErrors = new Counter('token_exchange_errors');
const tokenExchangeDuration = new Trend('token_exchange_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% requests < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    token_exchange_duration: ['p(95)<400'],          // 95% token exchanges < 400ms
  },
};

// Environment variables with defaults
const BASE_URL = __ENV.AUTH_SERVICE_URL || 'http://localhost:3000';
const TENANT_ID = __ENV.TENANT_ID || 'ikea';

// Test data
const tokens = [
  'demo-token-1',
  'demo-token-2',
  'demo-token-3',
  'demo-token-4',
  'demo-token-5',
];

export default function () {
  // Select a random token
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  const payload = `${TENANT_ID}:${token}`;

  // Token exchange endpoint
  const tokenExchangeUrl = `${BASE_URL}/auth/token/exchange`;
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'TokenExchange' },
  };

  // Measure token exchange
  const startTime = new Date();
  const tokenResponse = http.post(
    tokenExchangeUrl,
    JSON.stringify({ token: payload }),
    params
  );
  const duration = new Date() - startTime;

  tokenExchangeDuration.add(duration);

  // Check token exchange response
  const tokenCheck = check(tokenResponse, {
    'token exchange status is 200': (r) => r.status === 200,
    'token exchange has accessToken': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accessToken !== undefined;
      } catch {
        return false;
      }
    },
    'token exchange has tenant': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.tenant && body.tenant.id === TENANT_ID;
      } catch {
        return false;
      }
    },
    'token exchange response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!tokenCheck) {
    tokenExchangeErrors.add(1);
  }

  // Extract access token if successful
  let accessToken;
  if (tokenResponse.status === 200) {
    try {
      const body = JSON.parse(tokenResponse.body);
      accessToken = body.accessToken;
    } catch (e) {
      console.error('Failed to parse token response:', e);
    }
  }

  // Health check endpoint (public)
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
  });

  // If we have an access token, test authenticated endpoints
  if (accessToken) {
    // Metrics endpoint (public)
    const metricsUrl = `${BASE_URL}/metrics`;
    const metricsResponse = http.get(metricsUrl, {
      tags: { name: 'Metrics' },
    });

    check(metricsResponse, {
      'metrics status is 200': (r) => r.status === 200,
      'metrics response is not empty': (r) => r.body.length > 0,
    });
  }

  // Think time between requests
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

// Setup function (runs once per VU)
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Tenant ID: ${TENANT_ID}`);
  
  // Verify service is up
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Service not available: ${healthResponse.status}`);
  }
  
  console.log('Service health check passed');
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
  const colors = options.enableColors || false;
  
  let summary = '\n';
  summary += `${indent}Summary:\n`;
  summary += `${indent}  Duration: ${data.metrics.iteration_duration.avg.toFixed(2)}ms avg\n`;
  summary += `${indent}  Requests: ${data.metrics.http_reqs.count}\n`;
  summary += `${indent}  Failures: ${data.metrics.http_req_failed.values.rate.toFixed(2)}%\n`;
  summary += `${indent}  P95 Response Time: ${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99 Response Time: ${data.metrics.http_req_duration['p(99)'].toFixed(2)}ms\n`;
  
  return summary;
}
