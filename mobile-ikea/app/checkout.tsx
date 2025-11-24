import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useWishlistStore } from '../stores/wishlistStore';
import { Colors, Typography, Spacing } from '../constants/theme';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, count, clearWishlist } = useWishlistStore();
  
  const totalPrice = items.reduce((sum, item) => sum + item.price.amount, 0);

  const handleClose = async () => {
    await clearWishlist();
    router.push('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={32} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finish and pay</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* QR Code Section */}
      <View style={styles.content}>
        <View style={styles.qrContainer}>
          <QRCode
            value="https://www.amicissolutions.com"
            size={200}
            backgroundColor="white"
            color="black"
          />
        </View>

        <Text style={styles.title}>Scan code at checkout</Text>
        <Text style={styles.subtitle}>
          Please follow the instructions in the payment terminal.
        </Text>
      </View>

      {/* Bottom Summary */}
      <View style={styles.bottomSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total items</Text>
          <Text style={styles.summaryValue}>{count}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total price</Text>
          <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}</Text>
        </View>
        
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 70,
    paddingBottom: Spacing.lg,
    backgroundColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    backgroundColor: '#1a1a1a',
  },
  qrContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: 16,
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  bottomSummary: {
    padding: Spacing.xl,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.base,
    color: '#888',
  },
  summaryValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: Spacing.md,
  },
  totalLabel: {
    fontSize: Typography.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  totalPrice: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: Colors.white,
  },
  closeButton: {
    width: '100%',
    backgroundColor: Colors.ikeaBlue,
    paddingVertical: Spacing.lg,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  closeButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
});
