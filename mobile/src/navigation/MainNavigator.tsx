import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '../store';
import { useTheme } from '../theme/ThemeContext';
import { spacing, shadows } from '../theme';

import { HomeScreen } from '../screens/main/HomeScreen';
import { MapScreen } from '../screens/main/MapScreen';
import { CreateRequestScreen } from '../screens/main/CreateRequestScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import SocialFeedScreen from '../screens/main/SocialFeedScreen';
import UserProfileScreen from '../screens/main/UserProfileScreen';
import CreatePostScreen from '../screens/main/CreatePostScreen';
import RequestDetailScreen from '../screens/main/RequestDetailScreen';
import MyRequestsScreen from '../screens/main/MyRequestsScreen';
import ChatScreen from '../screens/main/ChatScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import AvatarPickerScreen from '../screens/main/AvatarPickerScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import TermsOfServiceScreen from '../screens/legal/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import ReportUserScreen from '../screens/main/ReportUserScreen';
import BackgroundCheckScreen from '../screens/main/BackgroundCheckScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const unreadNotifications = useAppSelector((s) => s.notifications.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 68 + insets.bottom,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom,
          ...shadows.md,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} colors={colors} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} colors={colors} />,
        }}
      />
      <Tab.Screen
        name="CreateRequest"
        component={CreateRequestScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View style={[tabStyles.createButton, { backgroundColor: focused ? colors.primaryDark : colors.primary }, shadows.colored(colors.primary)]}>
              <Text style={tabStyles.createIcon}>+</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={MyRequestsScreen}
        options={{
          tabBarLabel: 'Activity',
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon emoji="📋" focused={focused} colors={colors} />
              {unreadNotifications > 0 && (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} colors={colors} />,
        }}
      />
    </Tab.Navigator>
  );
}

const TabIcon: React.FC<{ emoji: string; focused: boolean; colors: any }> = ({ emoji, focused, colors }) => (
  <View style={[tabStyles.iconWrapper, focused && { backgroundColor: colors.primary + '30' }]}>
    <Text style={tabStyles.iconEmoji}>{emoji}</Text>
  </View>
);

const tabStyles = StyleSheet.create({
  iconWrapper: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  iconEmoji: { fontSize: 20 },
  createButton: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  createIcon: { fontSize: 28, fontWeight: '700', color: '#fff', lineHeight: 32 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#FC8181', borderRadius: 9999,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
});

export const MainNavigator: React.FC = () => {
  const { colors } = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="RequestDetail" component={RequestDetailScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="MyRequests" component={MyRequestsScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="AvatarPicker" component={AvatarPickerScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Social" component={SocialFeedScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="ReportUser" component={ReportUserScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="BackgroundCheck" component={BackgroundCheckScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Badges" component={PlaceholderScreen('Badges')} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

function PlaceholderScreen(title: string) {
  return function Placeholder() {
    const { colors } = useTheme();
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>Coming soon</Text>
      </View>
    );
  };
}
