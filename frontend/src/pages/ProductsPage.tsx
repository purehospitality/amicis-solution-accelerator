import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useWishlistStore } from '../store/wishlistStore';
import ProductCard from '../components/ProductCard';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  price: {
    amount: number;
    currency: string;
  };
  inventory?: {
    available: number;
    reserved: number;
  };
}

export default function ProductsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { store } = location.state || {};
  
  const { items, customerId, storeId, setCustomerId, setStoreId, addItem, removeItem, isInWishlist } = useWishlistStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('all');

  useEffect(() => {
    if (!store) {
      navigate('/stores');
      return;
    }

    // Set customer ID and store ID for wishlist operations
    if (!customerId) {
      setCustomerId('test-customer-789'); // In production, this would come from auth
    }
    if (storeId !== store.storeId) {
      setStoreId(store.storeId);
    }

    loadProducts();
    loadWishlist();
  }, [store, category]);

  const loadProducts = async () => {
    if (!store) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const filters = category !== 'all' ? { category } : {};
      const response = await apiClient.getProducts(store.storeId, filters);
      setProducts(response.products || []);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err.response?.data?.error || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = async () => {
    if (!store) return;
    
    try {
      const response = await apiClient.getWishlist(store.storeId, customerId || 'test-customer-789');
      // Sync wishlist from backend
      if (response.items) {
        // Update local store with backend items
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
      // Wishlist might not exist yet, that's okay
    }
  };

  const handleAddToWishlist = async (productId: string) => {
    if (!store) return;
    
    try {
      const response = await apiClient.addToWishlist(
        store.storeId, 
        customerId || 'test-customer-789', 
        productId
      );
      
      // Add to local store
      const product = products.find(p => p.id === productId);
      if (product && response.item) {
        addItem({
          id: response.item.id,
          productId: productId,
          sku: product.sku,
          name: product.name,
          price: product.price,
          addedAt: response.item.addedAt || new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('Failed to add to wishlist:', err);
      alert('Failed to add to wishlist: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    if (!store) return;
    
    // Find the wishlist item by productId
    const wishlistItem = items.find(item => item.productId === productId);
    if (!wishlistItem) return;
    
    try {
      await apiClient.removeFromWishlist(
        store.storeId,
        customerId || 'test-customer-789',
        wishlistItem.id
      );
      
      // Remove from local store
      removeItem(wishlistItem.id);
    } catch (err: any) {
      console.error('Failed to remove from wishlist:', err);
      alert('Failed to remove from wishlist: ' + (err.response?.data?.error || err.message));
    }
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
            <h1 style={{ margin: 0 }}>Products - {store.name}</h1>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              {products.length} items available
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => navigate('/wishlist', { state: { store } })}
              style={{
                background: '#e91e63',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              ❤️ Wishlist ({items.length})
            </button>
            <button onClick={() => navigate('/home', { state: location.state })}>
              ← Back to Home
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'furniture', 'decor', 'kitchen', 'bedroom'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '0.5rem 1rem',
                  border: category === cat ? '2px solid #0051a5' : '1px solid #ddd',
                  background: category === cat ? '#e3f2fd' : 'white',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.25rem', color: '#666' }}>Loading products...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="card" style={{ background: '#ffebee', padding: '1.5rem' }}>
            <h3 style={{ color: '#c62828', margin: '0 0 0.5rem 0' }}>Error Loading Products</h3>
            <p style={{ color: '#d32f2f', margin: 0 }}>{error}</p>
            <button 
              onClick={loadProducts}
              style={{ marginTop: '1rem' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && products.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isInWishlist={isInWishlist(product.id)}
                onAddToWishlist={handleAddToWishlist}
                onRemoveFromWishlist={handleRemoveFromWishlist}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && products.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h3 style={{ color: '#666', margin: '0 0 1rem 0' }}>No Products Found</h3>
            <p style={{ color: '#999' }}>Try selecting a different category</p>
          </div>
        )}
      </div>
    </div>
  );
}
