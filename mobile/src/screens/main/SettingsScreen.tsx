import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { useAppDispatch, useAppSelector } from '../../store';
import { restoreSession } from '../../store/slices/authSlice';
import { logout } from '../../store/slices/authSlice';
import { usersAPI } from '../../services/api';
import { spacing, radius, typography } from '../../theme';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark, toggleTheme } = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user) as any;
  const [isAvailable, setIsAvailable] = useState(user?.profile?.isAvailable ?? true);

  const s = makeStyles(colors);

  const handleAvailabilityToggle = async (val: boolean) => {
    setIsAvailable(val);
    try {
      await usersAPI.updateProfile({ isAvailable: val });
      await dispatch(restoreSession());
    } catch {
      setIsAvailable(!val); // revert
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
        {/* Appearance */}
        <Text style={s.sectionLabel}>Appearance</Text>
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Text style={s.rowIcon}>{isDark ? '🌙' : '☀️'}</Text>
              <View>
                <Text style={s.rowTitle}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
                <Text style={s.rowSub}>Switch between dark and light</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Volunteer Status */}
        <Text style={s.sectionLabel}>Volunteer Status</Text>
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Text style={s.rowIcon}>{isAvailable ? '🟢' : '⛔'}</Text>
              <View>
                <Text style={s.rowTitle}>{isAvailable ? 'Available to Help' : 'Not Available'}</Text>
                <Text style={s.rowSub}>
                  {isAvailable ? 'You appear in volunteer searches' : 'You won\'t be shown to requesters'}
                </Text>
              </View>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={handleAvailabilityToggle}
              trackColor={{ true: '#10B981', false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Profile */}
        <Text style={s.sectionLabel}>Profile</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('AvatarPicker')}>
            <View style={s.rowLeft}>
              <Text style={s.rowIcon}>🖼️</Text>
              <View>
                <Text style={s.rowTitle}>Change Profile Picture</Text>
                <Text style={s.rowSub}>Pick from 50 avatars</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('EditProfile')}>
            <View style={s.rowLeft}>
              <Text style={s.rowIcon}>✏️</Text>
              <View>
                <Text style={s.rowTitle}>Edit Profile</Text>
                <Text style={s.rowSub}>Name, bio, location</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <Text style={s.sectionLabel}>Notifications</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Notifications')}>
            <View style={s.rowLeft}>
              <Text style={s.rowIcon}>🔔</Text>
              <View>
                <Text style={s.rowTitle}>Notifications</Text>
                <Text style={s.rowSub}>Manage your alerts</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <Text style={s.sectionLabel}>Legal</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('TermsOfService')}>
            <View style={s.rowLeft}>
              <Text style={s.rowIcon}>📄</Text>
              <View>
                <Text style={s.rowTitle}>Terms of Service</Text>
                <Text style={s.rowSub}>Usage rules and agreements</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <View style={s.rowLeft}>
              <Text style={s.rowIcon}>🔒</Text>
              <View>
                <Text style={s.rowTitle}>Privacy Policy</Text>
                <Text style={s.rowSub}>How we handle your data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={handleLogout}>
            <View style={s.rowLeft}>
              <Text style={s.rowIcon}>🚪</Text>
              <View>
                <Text style={[s.rowTitle, { color: colors.error }]}>Sign Out</Text>
                <Text style={s.rowSub}>You will be logged out</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* App version */}
        <Text style={{ textAlign: 'center', fontSize: 12, color: colors.textMuted, marginTop: 32, marginBottom: 8 }}>
          QuickHelp v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof import('../../theme/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontWeight: '800', color: colors.text },
    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 1,
      marginTop: spacing.xl, marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: spacing.lg,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    rowIcon: { fontSize: 24 },
    rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
    rowSub: { fontSize: 13, color: colors.textMuted },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.xxxl + spacing.md },
  });
