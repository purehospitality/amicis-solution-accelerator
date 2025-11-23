import { useState } from 'react';

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

interface ProductCardProps {
  product: Product;
  isInWishlist: boolean;
  onAddToWishlist: (productId: string) => Promise<void>;
  onRemoveFromWishlist: (productId: string) => Promise<void>;
}

export default function ProductCard({ 
  product, 
  isInWishlist, 
  onAddToWishlist, 
  onRemoveFromWishlist 
}: ProductCardProps) {
  const [loading, setLoading] = useState(false);

  const handleWishlistToggle = async () => {
    setLoading(true);
    try {
      if (isInWishlist) {
        await onRemoveFromWishlist(product.id);
      } else {
        await onAddToWishlist(product.id);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ 
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '0.5rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>
            {product.name}
          </h3>
          <button
            onClick={handleWishlistToggle}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: loading ? 'wait' : 'pointer',
              padding: '0.25rem',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isInWishlist ? '❤️' : '🤍'}
          </button>
        </div>
        
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#666', 
          marginBottom: '0.5rem' 
        }}>
          SKU: {product.sku}
        </p>
        
        {product.category && (
          <span style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            background: '#f0f0f0',
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: '#666',
            marginBottom: '1rem',
          }}>
            {product.category}
          </span>
        )}
        
        {product.description && (
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#555',
            marginTop: '0.75rem',
            lineHeight: '1.5'
          }}>
            {product.description}
          </p>
        )}
      </div>
      
      <div style={{ 
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #e0e0e0'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <span style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: '#0051a5' 
            }}>
              ${product.price.amount.toFixed(2)}
            </span>
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#666',
              marginLeft: '0.5rem' 
            }}>
              {product.price.currency}
            </span>
          </div>
          
          {product.inventory && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>
                In Stock
              </div>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: 'bold',
                color: product.inventory.available > 0 ? '#2e7d32' : '#d32f2f'
              }}>
                {product.inventory.available}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
