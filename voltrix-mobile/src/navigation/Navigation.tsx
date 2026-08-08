import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../store/app.store';
import { COLORS } from '../lib/utils';
import api from '../lib/api';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';

// Main screens
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WatchScreen from '../screens/WatchScreen';
import UploadScreen from '../screens/UploadScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import StudioScreen from '../screens/StudioScreen';
import LiveScreen from '../screens/LiveScreen';
import ChannelScreen from '../screens/ChannelScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: '🏠', Search: '🔍', Upload: '➕',
  Messages: '💬', Profile: '👤',
};

function BottomTabs() {
  const { unreadMessages, unreadCount } = useAppStore();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <View>
            <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
              {TAB_ICONS[route.name]}
            </Text>
            {/* Badge for messages */}
            {route.name === 'Messages' && unreadMessages > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
              </View>
            )}
          </View>
        ),
        tabBarLabel: ({ focused }) => (
          <Text style={{ fontSize: 10, color: focused ? '#fff' : COLORS.textDim, fontWeight: focused ? '600' : '400', marginBottom: 2 }}>
            {route.name}
          </Text>
        ),
        tabBarStyle: { backgroundColor: '#111', borderTopColor: COLORS.border, height: 60, paddingBottom: 6, paddingTop: 6 },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={BottomTabs} />
      <Stack.Screen name="Watch" component={WatchScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Channel" component={ChannelScreen} />
      <Stack.Screen name="Studio" component={StudioScreen} />
      <Stack.Screen name="Library" component={HomeScreen} />
      <Stack.Screen name="Family" component={HomeScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="CreateChannel" component={HomeScreen} />
      <Stack.Screen name="Live" component={LiveScreen} />
      <Stack.Screen name="GoLive" component={HomeScreen} />
      <Stack.Screen name="Earnings" component={HomeScreen} />
      <Stack.Screen name="Conversation" component={HomeScreen} />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  const { isAuthenticated, setUser, setWalletBalance, setUnreadCount } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('voltrix_access_token').then(async (token) => {
      if (token) {
        try {
          const [userRes, walletRes, notifRes] = await Promise.all([
            api.get('/users/me'),
            api.get('/wallet/balance'),
            api.get('/notifications?unread_only=true&limit=1'),
          ]);
          setUser(userRes.data.data);
          setWalletBalance(walletRes.data.data.balance_ugx, walletRes.data.data.bonus_balance_ugx);
          setUnreadCount(notifRes.data.data.unread_count || 0);
        } catch {
          // Token invalid or network error — clear and show login
          await SecureStore.deleteItemAsync('voltrix_access_token');
          await SecureStore.deleteItemAsync('voltrix_refresh_token');
        }
      }
      setLoading(false);
    }).catch(() => {
      // SecureStore itself failed — just show login
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 56 }}>⚡</Text>
        <Text style={{ color: COLORS.electric, fontSize: 28, fontWeight: '900', marginTop: 8, letterSpacing: -0.5 }}>
          Voltrix
        </Text>
        <Text style={{ color: COLORS.textDim, fontSize: 12, marginTop: 4 }}>Uganda's video platform</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
