import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api';

export default function LoginPage() {
  const [tenantId, setTenantId] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Format: tenantId:token
      const userToken = `${tenantId}:${token}`;
      
      // Exchange token with auth service
      const result = await apiClient.exchangeToken(userToken);

      // Store auth info
      login(userToken, result.accessToken, result.tenant);
      
      // Set token for future API calls
      apiClient.setAuthToken(result.accessToken);

      // Navigate to store selection
      navigate('/stores');
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(
        err.response?.data?.message || 
        'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Amicis Login</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="tenantId">Tenant ID</label>
            <input
              id="tenantId"
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="e.g., ikea"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="token">User Token</label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your token"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#666' }}>
          <p>Demo Credentials:</p>
          <p>Tenant: <code>ikea</code></p>
          <p>Token: <code>user-token-123</code></p>
        </div>
      </div>
    </div>
  );
}
