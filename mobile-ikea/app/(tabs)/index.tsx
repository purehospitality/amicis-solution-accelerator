import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWishlistStore } from '../../stores/wishlistStore';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { DEMO_PRODUCTS } from '../../constants/products';

export default function HomeScreen() {
  const router = useRouter();
  const { addItem } = useWishlistStore();

  const handleAddToCart = (product: { articleNumber: string; name: string; price: number; image: string }) => {
    addItem({
      productId: product.articleNumber,
      name: product.name,
      articleNumber: product.articleNumber,
      price: {
        amount: product.price,
        currency: 'USD',
      },
      quantity: 1,
      image: product.image,
    });
  };

  const featuredProducts = DEMO_PRODUCTS.slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcons}>
          <Ionicons name="tablet-landscape-outline" size={24} color={Colors.black} />
          <Ionicons name="notifications-outline" size={24} color={Colors.black} style={{ marginLeft: 16 }} />
        </View>
        <Text style={styles.headerSubtitle}>Your store visit starts here</Text>
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>Atlanta, GA</Text>
          <Ionicons name="chevron-down" size={24} color={Colors.black} />
        </View>
        <View style={styles.storeStatus}>
          <Text style={styles.statusLabel}>Busy</Text>
          <View style={styles.statusDot} />
          <Text style={styles.statusTime}>Closes 8:00 PM</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/scan')}>
            <View style={[styles.actionIcon, styles.actionIconDark]}>
              <Ionicons name="barcode-outline" size={32} color={Colors.white} />
            </View>
            <Text style={styles.actionLabel}>Scan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Ionicons name="people-outline" size={32} color={Colors.black} />
            </View>
            <Text style={styles.actionLabel}>Popular times</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Ionicons name="restaurant-outline" size={32} color={Colors.black} />
            </View>
            <Text style={styles.actionLabel}>Food</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Ionicons name="information-circle-outline" size={32} color={Colors.black} />
            </View>
            <Text style={styles.actionLabel}>Store details</Text>
          </TouchableOpacity>
        </View>

        {/* Store Offers */}
        <View style={styles.storeOffers}>
          <View style={styles.offerHeader}>
            <Text style={styles.offerTitle}>Store offers and deals</Text>
            <Ionicons name="arrow-forward" size={24} color={Colors.white} />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productsScroll}>
            {featuredProducts.map((product) => (
              <View key={product.articleNumber} style={styles.productCard}>
                <View style={styles.productImageCard}>
                  <Text style={styles.productEmoji}>{product.image}</Text>
                  <TouchableOpacity style={styles.heartButton}>
                    <Ionicons name="heart-outline" size={24} color={Colors.black} />
                  </TouchableOpacity>
                </View>
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                  <View style={styles.priceRow}>
                    <View style={styles.priceBox}>
                      <Text style={styles.priceDollar}>$</Text>
                      <Text style={styles.priceAmount}>{Math.floor(product.price)}</Text>
                      <Text style={styles.priceCents}>.{String(product.price % 1).slice(2, 4).padEnd(2, '0')}</Text>
                    </View>
                    {product.name === 'FRIDHULT' && (
                      <Text style={styles.priceNote}>/2 pack</Text>
                    )}
                  </View>
                  {product.price > 50 && (
                    <View style={styles.rating}>
                      <Ionicons name="star" size={16} color={Colors.black} />
                      <Ionicons name="star" size={16} color={Colors.black} />
                      <Ionicons name="star" size={16} color={Colors.black} />
                      <Ionicons name="star-half" size={16} color={Colors.black} />
                      <Ionicons name="star-outline" size={16} color={Colors.black} />
                      <Text style={styles.ratingText}>(298)</Text>
                    </View>
                  )}
                  {product.inStock && (
                    <View style={styles.stock}>
                      <View style={styles.stockDot} />
                      <Text style={styles.stockText}>In stock in Atlanta, GA</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      
      {/* Start Scanning Button */}
      <View style={styles.scanButtonContainer}>
        <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/scan')}>
          <Ionicons name="barcode-outline" size={24} color={Colors.black} />
          <Text style={styles.scanButtonText}>Start scanning</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.ikeaYellow,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerIcons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.black,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.black,
    marginRight: 4,
  },
  storeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.ikeaBlue,
    marginRight: 8,
  },
  statusTime: {
    fontSize: 16,
    color: Colors.black,
  },
  content: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: Colors.ikeaYellow,
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    width: 80,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconDark: {
    backgroundColor: Colors.black,
  },
  actionLabel: {
    fontSize: 12,
    color: Colors.black,
    textAlign: 'center',
  },
  storeOffers: {
    backgroundColor: Colors.black,
    paddingTop: 20,
    paddingBottom: 120,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  offerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  productsScroll: {
    paddingLeft: 20,
  },
  productCard: {
    width: 280,
    marginRight: 16,
  },
  productImageCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 20,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productEmoji: {
    fontSize: 80,
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productDetails: {
    paddingTop: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.ikeaYellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceDollar: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.black,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.black,
  },
  priceCents: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
  },
  priceNote: {
    fontSize: 14,
    color: Colors.white,
    marginLeft: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: Colors.white,
    marginLeft: 4,
  },
  stock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  stockText: {
    fontSize: 14,
    color: Colors.white,
  },
  scanButtonContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  scanButton: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
    marginLeft: 8,
  },
});
