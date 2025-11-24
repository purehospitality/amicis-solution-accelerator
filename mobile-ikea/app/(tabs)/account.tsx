import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function AccountScreen() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        {/* Not logged in state */}
        <View style={styles.notLoggedInContainer}>
          <Ionicons name="person-circle-outline" size={80} color={Colors.mediumGray} />
          <Text style={styles.notLoggedInTitle}>Sign in to your account</Text>
          <Text style={styles.notLoggedInSubtitle}>
            Save your wishlist and checkout faster
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      {/* User Info */}
      <View style={styles.userInfoContainer}>
        <View style={styles.initialsCircle}>
          <Text style={styles.initialsText}>{user?.initials}</Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Settings Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Store</Text>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="location-outline" size={24} color={Colors.black} />
            <Text style={styles.settingItemText}>Selected Store</Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={styles.settingItemValue}>IKEA Brooklyn</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumGray} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="language-outline" size={24} color={Colors.black} />
            <Text style={styles.settingItemText}>Language</Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={styles.settingItemValue}>English</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumGray} />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="notifications-outline" size={24} color={Colors.black} />
            <Text style={styles.settingItemText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.mediumGray} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="help-circle-outline" size={24} color={Colors.black} />
            <Text style={styles.settingItemText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.mediumGray} />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.ikeaYellow,
    paddingHorizontal: Spacing.md,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: Colors.black,
  },
  notLoggedInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  notLoggedInTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.black,
    marginTop: Spacing.md,
  },
  notLoggedInSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.mediumGray,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: Colors.ikeaBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: 'bold',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  initialsCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.ikeaBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mediumGray,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.mediumGray,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingItemText: {
    fontSize: Typography.fontSize.base,
    color: Colors.black,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingItemValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mediumGray,
  },
  logoutButton: {
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: Colors.error,
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },
});
