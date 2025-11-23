import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenant, logout } = useAuthStore();
  const { store, routeInfo } = location.state || {};

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/stores');
  };

  if (!store || !routeInfo) {
    return (
      <div className="page">
        <div className="card">
          <h2>No Store Selected</h2>
          <button onClick={handleBack} className="button-primary">
            Select Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1>Welcome to {store.name}</h1>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              Tenant: {tenant?.name || 'Unknown'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleBack}>Change Store</button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => navigate('/products', { state: location.state })}
            className="card"
            style={{
              padding: '2rem 1.5rem',
              cursor: 'pointer',
              border: '2px solid #0051a5',
              background: 'linear-gradient(to bottom right, #e3f2fd, #fff)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,81,165,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛒</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#0051a5' }}>Browse Products</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
              View our catalog
            </p>
          </button>

          <button
            onClick={() => navigate('/wishlist', { state: location.state })}
            className="card"
            style={{
              padding: '2rem 1.5rem',
              cursor: 'pointer',
              border: '2px solid #e91e63',
              background: 'linear-gradient(to bottom right, #fce4ec, #fff)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(233,30,99,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>❤️</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#e91e63' }}>My Wishlist</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
              Saved items
            </p>
          </button>
        </div>

        <div className="card">
          <h2>Store Information</h2>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Store ID:</strong> {routeInfo.storeId}</p>
            <p style={{ marginTop: '0.5rem' }}><strong>Backend URL:</strong> {routeInfo.backendUrl}</p>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Backend Context</h2>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '1rem', 
            borderRadius: '8px',
            overflow: 'auto',
            marginTop: '1rem'
          }}>
            {JSON.stringify(routeInfo.backendContext, null, 2)}
          </pre>
        </div>

        <div className="card" style={{ marginTop: '1rem', background: '#e8f5e9' }}>
          <h3 style={{ color: '#2e7d32' }}>✓ Successfully Connected</h3>
          <p style={{ marginTop: '0.5rem', color: '#1b5e20' }}>
            Your application is connected to the backend service.
          </p>
        </div>
      </div>
    </div>
  );
}
