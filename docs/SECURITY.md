# Security Hardening Guide

This document outlines the security measures implemented in the Amicis Solution Accelerator to protect against common vulnerabilities and ensure production-grade security.

## Security Layers

```
┌──────────────────────────────────────────────────────────┐
│             Frontend (React/Capacitor)                    │
│  - Input validation                                       │
│  - Secure token storage                                   │
└────────────────┬─────────────────────────────────────────┘
                 │ HTTPS
                 ▼
┌──────────────────────────────────────────────────────────┐
│           Azure Static Web Apps                           │
│  - TLS 1.2+                                               │
│  - DDoS protection                                        │
│  - CDN caching                                            │
└────────────────┬─────────────────────────────────────────┘
                 │ HTTPS
                 ▼
┌──────────────────────────────────────────────────────────┐
│         NGINX Ingress Controller (AKS)                    │
│  - TLS termination                                        │
│  - Rate limiting                                          │
│  - ModSecurity WAF (optional)                             │
└────────────────┬─────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│ Go Routing   │  │ Node Auth        │
│ Service      │  │ Service          │
│              │  │                  │
│ - Rate       │  │ - Rate limiting  │
│   limiting   │  │ - Input          │
│ - JWT        │  │   validation     │
│   validation │  │ - Helmet         │
│ - Circuit    │  │   headers        │
│   breakers   │  │ - Circuit        │
│              │  │   breakers       │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       └────────┬──────────┘
                ▼
     ┌──────────────────────┐
     │ Azure Cosmos DB      │
     │ - Encryption at rest │
     │ - RBAC               │
     │ - Network isolation  │
     │ - Private endpoints  │
     └──────────────────────┘
```

## 1. Input Validation & Sanitization

### Node.js Service (class-validator)

**DTOs with Validation**:

```typescript
// src/auth/dto/exchange-token.dto.ts
import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class ExchangeTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'userToken is required' })
  @Matches(/^[a-zA-Z0-9\-_]+:[a-zA-Z0-9\-_\.]+$/, {
    message: 'userToken must be in format tenantId:token',
  })
  @MaxLength(2048, {
    message: 'userToken must not exceed 2048 characters',
  })
  userToken: string;
}
```

**Global Validation Pipe** (`main.ts`):
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip unknown properties
    forbidNonWhitelisted: true, // Reject requests with unknown properties
    transform: true, // Transform to DTO instances
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

**Validation Rules**:
- ✅ Token format: `^[a-zA-Z0-9\-_]+:[a-zA-Z0-9\-_\.]+$`
- ✅ Maximum length: 2048 characters
- ✅ Required fields enforced
- ✅ Unknown properties rejected

### Go Service (JWT Validation)

**Token Parsing** (`middleware.go`):
```go
func (app *App) authMiddleware(c *gin.Context) {
    authHeader := c.GetHeader("Authorization")
    if authHeader == "" {
        c.AbortWithStatusJSON(401, gin.H{"error": "Missing authorization header"})
        return
    }

    // Validate Bearer scheme
    parts := strings.Split(authHeader, " ")
    if len(parts) != 2 || parts[0] != "Bearer" {
        c.AbortWithStatusJSON(401, gin.H{"error": "Invalid authorization header format"})
        return
    }

    // Validate JWT structure and claims
    token := parts[1]
    claims, err := parseJWT(token)
    if err != nil {
        c.AbortWithStatusJSON(401, gin.H{"error": "Invalid token"})
        return
    }

    // Verify required claims
    if claims.TenantID == "" || claims.UserID == "" {
        c.AbortWithStatusJSON(401, gin.H{"error": "Missing required claims"})
        return
    }

    c.Set("user", claims)
    c.Next()
}
```

## 2. Rate Limiting

### Per-Tenant Rate Limiting (Go Service)

**Implementation** (`ratelimit.go`):
```go
type RateLimiter struct {
    limiters map[string]*rate.Limiter
    mu       sync.RWMutex
    rate     rate.Limit // requests per second
    burst    int        // max burst size
}

func NewRateLimiter(requestsPerSecond float64, burst int) *RateLimiter {
    return &RateLimiter{
        limiters: make(map[string]*rate.Limiter),
        rate:     rate.Limit(requestsPerSecond),
        burst:    burst,
    }
}
```

**Configuration**:
| Service | Rate Limit | Burst | Window |
|---------|-----------|-------|---------|
| Go Routing (per tenant) | 100 req/s | 200 | 1s |
| Node Auth (per IP) | 20 req | 20 | 60s |
| Node Auth (global) | 100 req | 100 | 60s |

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
Retry-After: 1
```

**Response When Exceeded**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 1
Content-Type: application/json

{
  "error": "Rate limit exceeded"
}
```

### Throttler (Node Service)

**Global Configuration** (`app.module.ts`):
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000, // 60 seconds
  limit: 100, // 100 requests per ttl window
}])
```

**Per-Route Override** (`auth.controller.ts`):
```typescript
@Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 req/min
@Post('exchange')
async exchangeToken(@Body() dto: ExchangeTokenDto) {
  // ...
}
```

## 3. Security Headers

### Helmet Configuration (Node Service)

**Implementation** (`main.ts`):
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));
```

**Security Headers Applied**:

| Header | Value | Purpose |
|--------|-------|---------|
| **X-Content-Type-Options** | nosniff | Prevent MIME sniffing |
| **X-Frame-Options** | DENY | Prevent clickjacking |
| **X-XSS-Protection** | 1; mode=block | Enable XSS filtering |
| **Strict-Transport-Security** | max-age=31536000; includeSubDomains; preload | Force HTTPS |
| **Content-Security-Policy** | default-src 'self' | Prevent XSS/injection |
| **Referrer-Policy** | no-referrer | Protect user privacy |

### CORS Configuration

**Configured Origins** (`main.ts`):
```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  credentials: true,
  maxAge: 3600, // 1 hour
});
```

**Production Configuration** (environment variable):
```bash
ALLOWED_ORIGINS=https://gray-cliff-0abcbae0f.3.azurestaticapps.net,https://amicis.ikea.com
```

## 4. Kubernetes Security Contexts

### Pod Security Standards

Both services implement **Restricted** Pod Security Standard:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault
```

### Container Security Contexts

```yaml
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
  runAsNonRoot: true
  runAsUser: 1000
```

**Security Measures**:
- ✅ Non-root user (UID 1000)
- ✅ Read-only root filesystem
- ✅ No privilege escalation
- ✅ All capabilities dropped
- ✅ Seccomp profile enabled

### Network Policies

**File**: `infra/k8s/network-policy.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: amicis-network-policy
  namespace: amicis
spec:
  podSelector:
    matchLabels:
      app: go-routing-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: mongodb
      ports:
        - protocol: TCP
          port: 27017
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

## 5. Secrets Management

### Azure Key Vault Integration

**Secrets Stored**:
- Cosmos DB connection strings
- Redis access keys
- JWT signing secrets
- Service principal credentials

**Access Pattern**:
```typescript
// Node service
const cosmosEndpoint = await this.keyVaultService.getSecret('COSMOS-ENDPOINT');
const cosmosKey = await this.keyVaultService.getSecret('COSMOS-KEY');
```

**Kubernetes Secrets** (from Key Vault):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cosmos-connection
  namespace: amicis
type: Opaque
data:
  endpoint: <base64-encoded>
  key: <base64-encoded>
```

## 6. Authentication & Authorization

### JWT Token Validation

**Token Structure**:
```json
{
  "iss": "amicis-auth-service",
  "sub": "user-12345",
  "tenantId": "ikea",
  "userId": "user-12345",
  "email": "user@ikea.com",
  "roles": ["customer"],
  "exp": 1735228800,
  "iat": 1735142400
}
```

**Validation Steps**:
1. ✅ Signature verification (HMAC-SHA256)
2. ✅ Expiration check (`exp` claim)
3. ✅ Required claims presence
4. ✅ Tenant ID validation
5. ✅ Role-based access control

### Role-Based Access Control (RBAC)

**Tenant Isolation**:
- Each request scoped to tenant from JWT
- Cross-tenant access prevented
- Tenant data partitioned in Cosmos DB

## 7. Data Protection

### Encryption at Rest

**Cosmos DB**:
- Azure-managed encryption keys
- TDE (Transparent Data Encryption)
- Encryption strength: AES-256

**Redis Cache**:
- Data encryption at rest enabled
- Managed encryption keys

### Encryption in Transit

**TLS Configuration**:
- Minimum version: TLS 1.2
- Cipher suites: Strong ciphers only
- Certificate: Let's Encrypt (auto-renewed)

**Certificate Management** (`letsencrypt-issuer.yaml`):
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@amicis.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

## 8. Vulnerability Management

### Dependency Scanning

**npm audit** (Node.js):
```powershell
cd backend/node-auth-service
npm audit
```

**Current Status**:
- 8 vulnerabilities identified
- 4 low, 2 moderate, 2 high
- Mostly in dev dependencies (@nestjs/cli, @nestjs/swagger)
- Production dependencies: Clean

**Mitigation Strategy**:
1. Dev dependencies isolated from production
2. Regular updates scheduled monthly
3. Breaking changes evaluated before upgrade
4. Security patches applied immediately

### Container Scanning

**Trivy** (Image Scanning):
```powershell
# Scan Docker images
trivy image acramicisikeadev.azurecr.io/go-routing-service:latest
trivy image acramicisikeadev.azurecr.io/node-auth-service:v1.0.7

# Scan for critical and high severity only
trivy image --severity CRITICAL,HIGH <image>
```

**Azure Defender for Containers**:
- Enabled on ACR (Azure Container Registry)
- Continuous vulnerability scanning
- Alerts on critical findings
- Integration with Security Center

## 9. Logging & Monitoring

### Security Event Logging

**Events Logged**:
- ✅ Failed authentication attempts
- ✅ Rate limit violations
- ✅ JWT validation failures
- ✅ Invalid input rejected
- ✅ Circuit breaker state changes

**Example Log Entry**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "warn",
  "correlationId": "abc123",
  "event": "authentication_failed",
  "tenantId": "ikea",
  "remoteAddr": "203.0.113.42",
  "reason": "invalid_token",
  "message": "JWT signature verification failed"
}
```

### Security Monitoring

**Application Insights Queries**:

**Failed Authentications**:
```kusto
traces
| where message contains "authentication_failed"
| summarize count() by bin(timestamp, 1h), tenantId
| order by timestamp desc
```

**Rate Limit Violations**:
```kusto
traces
| where message contains "Rate limit exceeded"
| summarize count() by bin(timestamp, 5m), tenantId
| order by timestamp desc
```

**Suspicious Activity**:
```kusto
traces
| where level == "error" or level == "warn"
| where message contains "unauthorized" or message contains "forbidden"
| project timestamp, correlationId, tenantId, remoteAddr, message
```

## 10. Incident Response

### Security Incident Checklist

**Detection**:
1. ☐ Monitor Application Insights alerts
2. ☐ Review security event logs
3. ☐ Check rate limit violations
4. ☐ Analyze failed authentication patterns

**Containment**:
1. ☐ Identify affected tenant(s)
2. ☐ Block malicious IP addresses (Network Policy)
3. ☐ Revoke compromised JWT tokens
4. ☐ Increase rate limits if DDoS

**Investigation**:
1. ☐ Collect correlation IDs
2. ☐ Review audit logs
3. ☐ Analyze attack vectors
4. ☐ Determine scope of breach

**Recovery**:
1. ☐ Rotate secrets (Key Vault)
2. ☐ Update JWT signing keys
3. ☐ Apply security patches
4. ☐ Restore services

**Post-Incident**:
1. ☐ Document findings
2. ☐ Update security policies
3. ☐ Improve monitoring
4. ☐ Conduct security review

## 11. Compliance & Best Practices

### OWASP Top 10 Mitigations

| Vulnerability | Mitigation |
|--------------|------------|
| **A01:2021 – Broken Access Control** | JWT validation, tenant isolation, RBAC |
| **A02:2021 – Cryptographic Failures** | TLS 1.2+, AES-256, Key Vault |
| **A03:2021 – Injection** | Input validation, parameterized queries |
| **A04:2021 – Insecure Design** | Security by design, threat modeling |
| **A05:2021 – Security Misconfiguration** | Secure defaults, security contexts |
| **A06:2021 – Vulnerable Components** | Dependency scanning, regular updates |
| **A07:2021 – Authentication Failures** | JWT, rate limiting, MFA (planned) |
| **A08:2021 – Software Integrity Failures** | Image signing, SBOM |
| **A09:2021 – Logging Failures** | Comprehensive logging, correlation IDs |
| **A10:2021 – SSRF** | Network policies, egress filtering |

### Security Checklist

**Pre-Deployment**:
- ☑ Code reviewed for security issues
- ☑ Dependencies scanned for vulnerabilities
- ☑ Container images scanned
- ☑ Security tests passed
- ☑ Secrets rotated
- ☑ TLS certificates valid

**Runtime**:
- ☑ Rate limiting enabled
- ☑ Input validation active
- ☑ Circuit breakers configured
- ☑ Security headers applied
- ☑ Logging enabled
- ☑ Monitoring alerts configured

**Ongoing**:
- ☐ Monthly dependency updates
- ☐ Quarterly security audits
- ☐ Annual penetration testing
- ☐ Security training for team
- ☐ Incident response drills

## 12. Testing Security

### Manual Security Testing

**Input Validation**:
```powershell
# Test invalid token format
Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/auth/exchange' `
  -Method POST `
  -ContentType 'application/json' `
  -Body '{"userToken":"invalid-format"}'

# Expected: 400 Bad Request with validation error

# Test XSS payload
$payload = @{
  userToken = "ikea:<script>alert('xss')</script>"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/auth/exchange' `
  -Method POST `
  -ContentType 'application/json' `
  -Body $payload

# Expected: 400 Bad Request (rejected by regex validation)
```

**Rate Limiting**:
```powershell
# Trigger rate limit
1..150 | ForEach-Object {
    try {
        Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
    } catch {
        Write-Host "Request $_: $($_.Exception.Message)"
    }
}

# Expected: 429 Too Many Requests after ~100 requests
```

**Security Headers**:
```powershell
$response = Invoke-WebRequest -Uri 'https://api.4.157.44.54.nip.io/health'
$response.Headers

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Automated Security Testing

**OWASP ZAP** (CI/CD Integration):
```yaml
- name: OWASP ZAP Scan
  run: |
    docker run -t owasp/zap2docker-stable zap-baseline.py \
      -t https://api.4.157.44.54.nip.io \
      -r zap-report.html
```

**Trivy in CI/CD** (`.github/workflows/security.yml`):
```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: acramicisikeadev.azurecr.io/go-routing-service:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
```

## 13. Future Enhancements

### Planned Security Improvements

**Short-term (Q1 2025)**:
- [ ] Multi-factor authentication (MFA)
- [ ] API request signing
- [ ] Enhanced audit logging
- [ ] Security.txt file
- [ ] Bug bounty program

**Medium-term (Q2-Q3 2025)**:
- [ ] Web Application Firewall (ModSecurity)
- [ ] DDoS protection (Azure Front Door)
- [ ] Secrets rotation automation
- [ ] Security dashboard (Grafana)
- [ ] SIEM integration

**Long-term (Q4 2025+)**:
- [ ] SOC 2 Type II compliance
- [ ] GDPR compliance enhancements
- [ ] Zero-trust architecture
- [ ] Blockchain audit trail
- [ ] AI-powered threat detection

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [Azure Security Best Practices](https://docs.microsoft.com/en-us/azure/security/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [class-validator](https://github.com/typestack/class-validator)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
