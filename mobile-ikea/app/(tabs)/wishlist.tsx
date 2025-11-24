import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function WishlistScreen() {
  const { items, count, fetchWishlist, removeItem } = useWishlistStore();
  const { user } = useAuthStore();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (itemId: string) => {
    try {
      await removeItem(itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleCheckout = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    setShowConfirmation(false);
    router.push('/checkout');
  };

  const totalPrice = items.reduce((sum, item) => sum + item.price.amount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wishlist ({count})</Text>
      
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtext}>Scan products to add them</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.item}>
                {item.image && (
                  <View style={styles.itemImageContainer}>
                    <Text style={styles.itemEmoji}>{item.image}</Text>
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.articleNumber}>{item.articleNumber}</Text>
                  <Text style={styles.itemPrice}>
                    ${item.price.amount.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => handleRemove(item.id)}
                >
                  <Ionicons name="trash-outline" size={24} color={Colors.error} />
                </TouchableOpacity>
              </View>
            )}
          />
          
          {/* Bottom Buttons */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/scan')}>
              <Ionicons name="barcode-outline" size={32} color={Colors.black} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <Text style={styles.checkoutButtonText}>Store checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Have you scanned everything?</Text>
            <Text style={styles.modalDescription}>
              Please double check that you have scanned everything in your shopping bag.
            </Text>
            <Text style={styles.modalEmail}>
              Your receipt will be sent to {user?.email || 'your email'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonBack} 
                onPress={() => setShowConfirmation(false)}
              >
                <Text style={styles.modalButtonBackText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonConfirm} 
                onPress={handleConfirm}
              >
                <Text style={styles.modalButtonConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: Colors.black,
    backgroundColor: Colors.ikeaYellow,
    paddingHorizontal: Spacing.md,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    marginBottom: 0,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.xl,
    color: Colors.mediumGray,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.mediumGray,
    marginTop: Spacing.sm,
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemEmoji: {
    fontSize: 40,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.fontSize.base,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  articleNumber: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mediumGray,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: Typography.fontSize.base,
    fontWeight: 'bold',
    color: Colors.ikeaBlue,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    gap: Spacing.md,
  },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutButton: {
    flex: 1,
    height: 60,
    backgroundColor: Colors.ikeaBlue,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: Typography.fontSize.base,
    color: '#666',
    marginBottom: Spacing.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalEmail: {
    fontSize: Typography.fontSize.sm,
    color: '#666',
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalButtonBack: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.ikeaBlue,
    alignItems: 'center',
  },
  modalButtonBackText: {
    fontSize: Typography.fontSize.base,
    fontWeight: 'bold',
    color: Colors.ikeaBlue,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 24,
    backgroundColor: Colors.ikeaBlue,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: Typography.fontSize.base,
    fontWeight: 'bold',
    color: Colors.white,
  },
});
