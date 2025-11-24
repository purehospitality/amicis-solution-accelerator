import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWishlistStore } from '../../stores/wishlistStore';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { DEMO_PRODUCTS, DemoProduct, getRandomProduct } from '../../constants/products';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [articleNumber, setArticleNumber] = useState('');
  const [scannedProduct, setScannedProduct] = useState<DemoProduct | null>(null);
  const router = useRouter();
  const { items, addItem } = useWishlistStore();
  const itemCount = items.length;

  if (!permission) {
    return <View style={styles.container}><Text style={styles.whiteText}>Loading...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.whiteText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return; // Prevent multiple scans
    setScanned(true);
    
    // Get random product from demo data
    const product = getRandomProduct();
    setScannedProduct(product);
    setShowProductModal(true);
  };

  const handleAddToCart = () => {
    if (!scannedProduct) return;
    
    const newItem = {
      productId: scannedProduct.articleNumber,
      name: scannedProduct.name,
      articleNumber: scannedProduct.articleNumber,
      price: {
        amount: scannedProduct.price,
        currency: 'USD',
      },
      quantity: 1,
      image: scannedProduct.image,
    };
    
    addItem(newItem);
    
    // Close modal and reset for next scan
    setShowProductModal(false);
    setScannedProduct(null);
    setScanned(false);
  };

  const handleCloseModal = () => {
    setShowProductModal(false);
    setScannedProduct(null);
    setScanned(false);
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
  };

  const handleNumberPress = (num: string) => {
    if (articleNumber.length < 10) {
      setArticleNumber(articleNumber + num);
    }
  };

  const handleBackspace = () => {
    setArticleNumber(articleNumber.slice(0, -1));
  };

  const handleManualContinue = () => {
    if (articleNumber.length >= 8) {
      setShowManualEntry(false);
      // Look up product or use random
      const product = getRandomProduct();
      setScannedProduct(product);
      setShowProductModal(true);
      setArticleNumber('');
    }
  };

  const handleAddFromManual = () => {
    if (articleNumber.length >= 8) {
      // Get random product and add directly to wishlist
      const product = getRandomProduct();
      const newItem = {
        productId: product.articleNumber,
        name: product.name,
        articleNumber: product.articleNumber,
        price: {
          amount: product.price,
          currency: 'USD',
        },
        quantity: 1,
        image: product.image,
      };
      addItem(newItem);
      
      // Close manual entry and reset
      setShowManualEntry(false);
      setArticleNumber('');
    }
  };

  const handleCloseManualEntry = () => {
    setShowManualEntry(false);
    setArticleNumber('');
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
      >
        <View style={styles.overlay}>
          {/* Top dark overlay */}
          <View style={styles.topOverlay}>
            <Text style={styles.instructions}>Point camera at barcode</Text>
          </View>
          
          {/* Middle section with scan area */}
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.scanFrame} />
            <View style={styles.sideOverlay} />
          </View>
          
          {/* Bottom dark overlay */}
          <View style={styles.bottomOverlay}>
            <TouchableOpacity 
              style={styles.manualButton}
              onPress={handleManualEntry}
            >
              <Text style={styles.manualButtonText}>Enter the article number</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Floating Cart Button */}
        <TouchableOpacity 
          style={styles.floatingCart}
          onPress={() => router.push('/wishlist')}
        >
          <Ionicons name="cart" size={28} color={Colors.white} />
          {itemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </CameraView>

      {/* Product Detail Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
            <View style={styles.closeCircle}>
              <Ionicons name="close" size={28} color={Colors.white} />
            </View>
          </TouchableOpacity>

          {/* Heart Button */}
          <TouchableOpacity style={styles.heartButton}>
            <View style={styles.heartCircle}>
              <Ionicons name="heart-outline" size={28} color={Colors.white} />
            </View>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Product Image */}
            <View style={styles.productImageContainer}>
              <Text style={styles.productEmoji}>{scannedProduct?.image}</Text>
            </View>

            {/* Product Details */}
            <View style={styles.productDetails}>
              <View style={styles.productHeader}>
                <Text style={styles.productTitle}>{scannedProduct?.name}</Text>
                <View style={styles.stockBadge}>
                  <View style={styles.stockDot} />
                  <Text style={styles.stockText}>In stock</Text>
                </View>
              </View>

              <Text style={styles.productDescription}>{scannedProduct?.description}</Text>

              <Text style={styles.productPriceLabel}>$</Text>
              <Text style={styles.productPriceLarge}>{scannedProduct?.price.toFixed(2)}</Text>

              <Text style={styles.articleNumber}>{scannedProduct?.articleNumber}</Text>

              <View style={styles.divider} />

              {/* Reviews Section */}
              <TouchableOpacity style={styles.reviewRow}>
                <Text style={styles.reviewText}>Reviews</Text>
                <Ionicons name="chevron-forward" size={24} color={Colors.white} />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* More Info Section */}
              <TouchableOpacity style={styles.reviewRow}>
                <Text style={styles.reviewText}>More info</Text>
                <Ionicons name="chevron-forward" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Add Button */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
              <Text style={styles.addButtonText}>
                Add ${scannedProduct?.price.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseManualEntry}
      >
        <View style={styles.manualEntryContainer}>
          {/* Header */}
          <View style={styles.manualEntryHeader}>
            <TouchableOpacity onPress={handleCloseManualEntry}>
              <Ionicons name="close" size={32} color="#888" />
            </TouchableOpacity>
            <Text style={styles.headerLocationText}>Atlanta, GA</Text>
            <TouchableOpacity>
              <Ionicons name="help-circle-outline" size={32} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={styles.manualEntryContent}>
            <Text style={styles.manualEntryTitle}>Enter the article number</Text>
            <Text style={styles.manualEntrySubtitle}>To continue, please enter an 8 digit article num...</Text>
            
            {/* Article Number Display */}
            <Text style={styles.articleLabel}>Article number</Text>
            <View style={styles.articleDisplay}>
              <Text style={styles.articleDisplayText}>
                {articleNumber || ''}
              </Text>
            </View>
            <Text style={styles.articleExample}>ex. 12345678</Text>

            {/* Add to List Button */}
            <TouchableOpacity 
              style={[
                styles.addToListButton,
                articleNumber.length >= 8 && styles.addToListButtonEnabled
              ]}
              onPress={handleAddFromManual}
              disabled={articleNumber.length < 8}
            >
              <Text style={[
                styles.addToListButtonText,
                articleNumber.length >= 8 && styles.addToListButtonTextEnabled
              ]}>Add to list</Text>
            </TouchableOpacity>

            {/* Numeric Keypad */}
            <View style={styles.keypad}>
              {/* Row 1 */}
              <View style={styles.keypadRow}>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('1')}>
                  <Text style={styles.keypadButtonText}>1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('2')}>
                  <Text style={styles.keypadButtonText}>2</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('3')}>
                  <Text style={styles.keypadButtonText}>3</Text>
                </TouchableOpacity>
              </View>

              {/* Row 2 */}
              <View style={styles.keypadRow}>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('4')}>
                  <Text style={styles.keypadButtonText}>4</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('5')}>
                  <Text style={styles.keypadButtonText}>5</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('6')}>
                  <Text style={styles.keypadButtonText}>6</Text>
                </TouchableOpacity>
              </View>

              {/* Row 3 */}
              <View style={styles.keypadRow}>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('7')}>
                  <Text style={styles.keypadButtonText}>7</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('8')}>
                  <Text style={styles.keypadButtonText}>8</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('9')}>
                  <Text style={styles.keypadButtonText}>9</Text>
                </TouchableOpacity>
              </View>

              {/* Row 4 */}
              <View style={styles.keypadRow}>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('.')}>
                  <Text style={styles.keypadButtonText}>.</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('0')}>
                  <Text style={styles.keypadButtonText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.keypadButton} onPress={handleBackspace}>
                  <Ionicons name="backspace-outline" size={28} color={Colors.black} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity 
              style={[
                styles.continueButton,
                articleNumber.length >= 8 && styles.continueButtonEnabled
              ]}
              onPress={handleManualContinue}
              disabled={articleNumber.length < 8}
            >
              <Text style={[
                styles.continueButtonText,
                articleNumber.length >= 8 && styles.continueButtonTextEnabled
              ]}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.lg,
    paddingTop: Spacing['2xl'] + 20,
    alignItems: 'center',
  },
  middleRow: {
    flexDirection: 'row',
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'] + 20,
    alignItems: 'center',
  },
  instructions: {
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  scanFrame: {
    width: 320,
    height: 250,
    borderWidth: 3,
    borderColor: Colors.ikeaYellow,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  manualButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 24,
  },
  manualButtonText: {
    color: Colors.black,
    fontSize: Typography.fontSize.base,
    fontWeight: 'bold',
  },
  whiteText: {
    color: Colors.white,
    fontSize: Typography.fontSize.lg,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.ikeaYellow,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: 'bold',
  },
  floatingCart: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.ikeaBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.ikeaYellow,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.black,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  closeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  heartCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingBottom: 100,
  },
  productImageContainer: {
    width: '100%',
    height: 400,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productEmoji: {
    fontSize: 120,
  },
  productDetails: {
    backgroundColor: '#2b2b2b',
    padding: Spacing.lg,
    minHeight: 400,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  productTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: Colors.white,
    flex: 1,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
    marginRight: 6,
  },
  stockText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
  },
  productDescription: {
    fontSize: Typography.fontSize.base,
    color: '#999',
    marginBottom: Spacing.lg,
  },
  productPriceLabel: {
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
    fontWeight: 'bold',
  },
  productPriceLarge: {
    fontSize: 48,
    color: Colors.white,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  articleNumber: {
    fontSize: Typography.fontSize.base,
    color: '#666',
    marginBottom: Spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: Spacing.md,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  reviewText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: '#2b2b2b',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  addButton: {
    backgroundColor: Colors.ikeaBlue,
    paddingVertical: Spacing.lg,
    borderRadius: 24,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
    fontWeight: 'bold',
  },
  manualEntryContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  manualEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 50,
    paddingBottom: Spacing.sm,
  },
  headerLocationText: {
    fontSize: Typography.fontSize.base,
    color: '#888',
    fontWeight: '500',
  },
  manualEntryContent: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: Spacing.xl,
  },
  manualEntryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    color: Colors.white,
  },
  manualEntrySubtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: Spacing['2xl'],
  },
  articleLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: Spacing.sm,
  },
  articleDisplay: {
    width: '100%',
    padding: Spacing.lg,
    backgroundColor: 'transparent',
    borderRadius: 8,
    marginBottom: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.ikeaBlue,
  },
  articleDisplayText: {
    fontSize: 24,
    fontWeight: '400',
    color: Colors.white,
    letterSpacing: 1,
  },
  articleExample: {
    fontSize: 14,
    color: '#666',
    marginBottom: Spacing.xl,
  },
  addToListButton: {
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#505050',
    marginBottom: Spacing.xl,
  },
  addToListButtonEnabled: {
    backgroundColor: Colors.ikeaBlue,
  },
  addToListButtonText: {
    fontSize: Typography.fontSize.lg,
    color: '#999',
    fontWeight: 'bold',
  },
  addToListButtonTextEnabled: {
    color: Colors.white,
  },
  keypad: {
    width: '100%',
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  keypadButton: {
    width: '30%',
    aspectRatio: 1.5,
    backgroundColor: '#404040',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '600',
    color: Colors.white,
  },
  continueButton: {
    width: '100%',
    backgroundColor: '#505050',
    paddingVertical: Spacing.lg,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },
  continueButtonEnabled: {
    backgroundColor: Colors.ikeaBlue,
  },
  continueButtonText: {
    fontSize: Typography.fontSize.lg,
    color: '#999',
    fontWeight: '600',
  },
  continueButtonTextEnabled: {
    color: Colors.white,
  },
});
