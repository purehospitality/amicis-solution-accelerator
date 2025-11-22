import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api';

interface Store {
  storeId: string;
  name: string;
  backendUrl: string;
}

// Mock stores - in production, this would come from an API
const mockStores: Store[] = [
  { storeId: 'IKEA001', name: 'IKEA Stockholm', backendUrl: 'https://ikea-backend.example.com' },
  { storeId: 'IKEA002', name: 'IKEA Gothenburg', backendUrl: 'https://ikea-backend.example.com' },
  { storeId: 'IKEA003', name: 'IKEA Malmo', backendUrl: 'https://ikea-backend.example.com' },
];

export default function StoreSelectionPage() {
  const [stores] = useState<Store[]>(mockStores);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { tenant, logout } = useAuthStore();

  useEffect(() => {
    // Set the access token for API calls
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      apiClient.setAuthToken(accessToken);
    }
  }, []);

  const handleStoreSelect = async (store: Store) => {
    setLoading(true);
    setError('');

    try {
      // Get routing information for selected store
      const routeInfo = await apiClient.getStoreRoute(store.storeId);
      
      console.log('Route info:', routeInfo);
      
      // Navigate to home with store context
      navigate('/home', { state: { store, routeInfo } });
    } catch (err: any) {
      console.error('Failed to get store route:', err);
      setError('Failed to load store information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    apiClient.setAuthToken(null);
    navigate('/login');
  };

  return (
    <div className="page">
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1>Select Store</h1>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              Tenant: {tenant?.name || 'Unknown'}
            </p>
          </div>
          <button onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
            Logout
          </button>
        </div>

        {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {stores.map((store) => (
            <div
              key={store.storeId}
              className="card"
              style={{
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
              onClick={() => !loading && handleStoreSelect(store)}
            >
              <h3>{store.name}</h3>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                Store ID: {store.storeId}
              </p>
            </div>
          ))}
        </div>

        {loading && (
          <div className="loading">
            <p>Loading store information...</p>
          </div>
        )}
      </div>
    </div>
  );
}
