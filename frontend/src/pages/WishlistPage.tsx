import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useWishlistStore } from '../store/wishlistStore';

interface WishlistItemDetails {
  id: string;
  productId: string;
  sku?: string;
  name?: string;
  price?: {
    amount: number;
    currency: string;
  };
  addedAt: string;
}

export default function WishlistPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { store } = location.state || {};
  
  const { items, customerId, setCustomerId, removeItem } = useWishlistStore();
  
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!store) {
      navigate('/stores');
      return;
    }

    if (!customerId) {
      setCustomerId('test-customer-789');
    }

    loadWishlist();
  }, [store]);

  const loadWishlist = async () => {
    if (!store) return;
    
    setLoading(true);
    
    try {
      const response = await apiClient.getWishlist(
        store.storeId, 
        customerId || 'test-customer-789'
      );
      
      // Sync with backend
      if (response.items) {
        const backendItems = response.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          price: item.price,
          addedAt: item.addedAt,
        }));
        useWishlistStore.setState({ items: backendItems });
      }
    } catch (err: any) {
      console.error('Failed to load wishlist:', err);
      // If wishlist doesn't exist, that's okay - show empty state
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (item: WishlistItemDetails) => {
    if (!store) return;
    
    setRemovingId(item.id);
    
    try {
      await apiClient.removeFromWishlist(
        store.storeId,
        customerId || 'test-customer-789',
        item.id
      );
      
      removeItem(item.id);
    } catch (err: any) {
      console.error('Failed to remove item:', err);
      alert('Failed to remove item: ' + (err.response?.data?.error || err.message));
    } finally {
      setRemovingId(null);
    }
  };

  const handleViewProduct = (productId: string) => {
    // In a real app, this would navigate to product detail page
    console.log('View product:', productId);
  };

  if (!store) {
    return null;
  }

  return (
    <div className="page">
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>❤️</span>
              <span>My Wishlist</span>
            </h1>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => navigate('/products', { state: { store } })}
              className="button-primary"
            >
              Continue Shopping
            </button>
            <button onClick={() => navigate('/home', { state: location.state })}>
              ← Back to Home
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.25rem', color: '#666' }}>Loading wishlist...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="card" style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem',
            background: 'linear-gradient(to bottom, #fff, #f9fafb)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤍</div>
            <h2 style={{ color: '#666', margin: '0 0 1rem 0' }}>Your Wishlist is Empty</h2>
            <p style={{ color: '#999', marginBottom: '2rem' }}>
              Start adding products you love to your wishlist
            </p>
            <button 
              onClick={() => navigate('/products', { state: { store } })}
              className="button-primary"
              style={{
                padding: '1rem 2rem',
                fontSize: '1.1rem',
              }}
            >
              Browse Products
            </button>
          </div>
        )}

        {/* Wishlist Items */}
        {!loading && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item) => (
              <div 
                key={item.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1.5rem',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    margin: '0 0 0.5rem 0', 
                    fontSize: '1.25rem',
                    color: '#333'
                  }}>
                    {item.name || 'Product'}
                  </h3>
                  
                  {item.sku && (
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#666',
                      margin: '0 0 0.5rem 0'
                    }}>
                      SKU: {item.sku}
                    </p>
                  )}
                  
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: '#999',
                    margin: 0
                  }}>
                    Added {new Date(item.addedAt).toLocaleDateString()}
                  </p>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '2rem' 
                }}>
                  {item.price && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 'bold',
                        color: '#0051a5'
                      }}>
                        ${item.price.amount.toFixed(2)}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#666'
                      }}>
                        {item.price.currency}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleViewProduct(item.productId)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#0051a5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                      }}
                    >
                      View
                    </button>
                    
                    <button
                      onClick={() => handleRemoveItem(item)}
                      disabled={removingId === item.id}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: removingId === item.id ? '#ccc' : '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: removingId === item.id ? 'wait' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                      }}
                    >
                      {removingId === item.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="card" style={{ 
              padding: '1.5rem',
              background: '#f0f7ff',
              borderLeft: '4px solid #0051a5'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#0051a5' }}>
                    Total Items: {items.length}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
                    Total Value: ${items.reduce((sum, item) => 
                      sum + (item.price?.amount || 0), 0
                    ).toFixed(2)}
                  </p>
                </div>
                
                <button 
                  onClick={() => navigate('/products', { state: { store } })}
                  className="button-primary"
                  style={{
                    padding: '1rem 2rem',
                  }}
                >
                  Add More Items
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
