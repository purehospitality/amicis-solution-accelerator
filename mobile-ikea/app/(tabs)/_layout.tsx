import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/theme';

export default function TabsLayout() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barcode" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => {
            if (isAuthenticated && user) {
              return (
                <View style={[
                  styles.initialsCircle,
                  { backgroundColor: focused ? Colors.ikeaBlue : color }
                ]}>
                  <Text style={styles.initialsText}>{user.initials}</Text>
                </View>
              );
            }
            return <Ionicons name="person" size={28} color={color} />;
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  initialsCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
