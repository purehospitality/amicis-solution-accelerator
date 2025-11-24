// IKEA Product Catalog - Demo Data
// Real IKEA products with article numbers and images

export interface DemoProduct {
  articleNumber: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    articleNumber: '005.754.51',
    name: 'FRIDHULT',
    description: 'Sleeper sofa, Skiftebo yellow',
    price: 349.00,
    image: '🛋️',
    category: 'furniture',
    inStock: true,
  },
  {
    articleNumber: '704.099.73',
    name: 'BILLY',
    description: 'Bookcase, white, 31 1/2x11x79 1/2"',
    price: 79.99,
    image: '📚',
    category: 'furniture',
    inStock: true,
  },
  {
    articleNumber: '398.291.48',
    name: 'POÄNG',
    description: 'Armchair, birch veneer/Knisa light beige',
    price: 129.99,
    image: '🪑',
    category: 'furniture',
    inStock: true,
  },
  {
    articleNumber: '703.561.45',
    name: 'FADO',
    description: 'Table lamp, white, 10"',
    price: 19.99,
    image: '💡',
    category: 'lighting',
    inStock: true,
  },
  {
    articleNumber: '991.754.23',
    name: 'MALM',
    description: 'Bed frame, high, white stained oak veneer, Queen',
    price: 199.99,
    image: '🛏️',
    category: 'furniture',
    inStock: true,
  },
  {
    articleNumber: '203.057.44',
    name: 'KALLAX',
    description: 'Shelf unit, white, 30 3/8x57 7/8"',
    price: 89.99,
    image: '📦',
    category: 'furniture',
    inStock: true,
  },
  {
    articleNumber: '192.200.77',
    name: 'EKTORP',
    description: 'Sofa, 3-seat, Totebo light beige',
    price: 499.99,
    image: '🛋️',
    category: 'furniture',
    inStock: true,
  },
  {
    articleNumber: '001.042.91',
    name: 'LACK',
    description: 'Side table, white, 21 5/8x21 5/8"',
    price: 9.99,
    image: '🪑',
    category: 'furniture',
    inStock: true,
  },
  {
    articleNumber: '503.832.22',
    name: 'HEMNES',
    description: 'Dresser, 8-drawer, white stain',
    price: 249.99,
    image: '🗄️',
    category: 'furniture',
    inStock: true,
  },
  {
    articleNumber: '704.387.93',
    name: 'KLIPPAN',
    description: 'Loveseat, Vissle gray',
    price: 199.00,
    image: '🛋️',
    category: 'furniture',
    inStock: true,
  },
];

// Helper function to get product by article number
export const getProductByArticle = (articleNumber: string): DemoProduct | undefined => {
  return DEMO_PRODUCTS.find(p => p.articleNumber === articleNumber);
};

// Helper function to get random product
export const getRandomProduct = (): DemoProduct => {
  return DEMO_PRODUCTS[Math.floor(Math.random() * DEMO_PRODUCTS.length)];
};
