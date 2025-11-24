/**
 * IKEA SKAPA Design System Tokens
 * https://design.ikea.com/
 */

export const Colors = {
  // Primary IKEA Colors
  ikeaYellow: '#FFCC00',
  ikeaBlue: '#0058A3',
  
  // Grays
  black: '#111111',
  darkGray: '#1A1A1A',
  mediumGray: '#484848',
  lightGray: '#DFDFDF',
  white: '#FFFFFF',
  
  // Semantic Colors
  success: '#0B8043',
  error: '#CC0000',
  warning: '#FF6B00',
  
  // Status Colors
  inStock: '#0B8043',
  lowStock: '#FF6B00',
  outOfStock: '#CC0000',
  
  // Background
  background: '#FFFFFF',
  surface: '#F5F5F5',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const Typography = {
  // Font Family (Noto IKEA - fallback to system)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
