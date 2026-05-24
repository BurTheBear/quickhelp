import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { usersAPI } from '../../services/api';
import { XPBar } from '../../components/gamification/XPBar';
import { colors, spacing, radius, typography, shadows } from '../../theme';

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

interface Stats {
  profile: { tasksCompleted: number; tasksRequested: number; avgRating: number; totalRatings: number };
  gamification: { totalXp: number; weeklyXp: number; monthlyXp: number; level: number };
  streaks: { currentStreak: number; longestStreak: number };
  totalMinutes: number;
}

interface BadgeData {
  earned: Array<{ earnedAt: string; badge: { id: string; name: string; iconUrl: string; rarity: string } }>;
  notEarned: Array<{ id: string; name: string; iconUrl: string; rarity: string }>;
}

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector((s) => s.auth);

  const [stats, setStats] = useState<Stats | null>(null);
  const [badges, setBadges] = useState<BadgeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, badgesRes] = await Promise.all([
          usersAPI.getMyStats(),
          usersAPI.getMyBadges(),
        ]);
        setStats(statsRes.data.data);
        setBadges(badgesRes.data.data);
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  const gamification = user?.gamification;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
      >
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>

        {user?.profile?.avatarUrl?.startsWith('emoji://') ? (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={{ fontSize: 42 }}>{user.profile.avatarUrl.replace('emoji://', '')}</Text>
          </View>
        ) : user?.profile?.avatarUrl ? (
          <Image source={{ uri: user.profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {user?.profile?.displayName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}

        <Text style={styles.displayName}>{user?.profile?.displayName ?? 'Anonymous'}</Text>
        {user?.profile?.bio && (
          <Text style={styles.bio} numberOfLines={2}>{user.profile.bio}</Text>
        )}
        {user?.profile?.city && (
          <Text style={styles.location}>📍 {user.profile.city}</Text>
        )}

        <View style={styles.verificationRow}>
          {user?.verificationLevel === 'ID_VERIFIED' && (
            <View style={styles.verifiedChip}>
              <Text style={styles.verifiedText}>✓ ID Verified</Text>
            </View>
          )}
          {user?.profile?.skills?.slice(0, 3).map((skill) => (
            <View key={skill} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* XP Section */}
      {gamification && (
        <View style={styles.section}>
          <XPBar
            level={gamification.level}
            levelName={gamification.levelName}
            currentXp={gamification.currentLevelXp}
            nextLevelXp={gamification.nextLevelXp}
            totalXp={gamification.totalXp}
          />
        </View>
      )}

      {/* Stats Grid */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Impact</Text>
          <View style={styles.statsGrid}>
            <StatCard emoji="✅" value={stats.profile.tasksCompleted} label="Tasks Done" />
            <StatCard emoji="⭐" value={stats.profile.avgRating.toFixed(1)} label="Rating" />
            <StatCard emoji="🔥" value={stats.streaks.currentStreak} label="Day Streak" />
            <StatCard emoji="⏱" value={`${Math.round(stats.totalMinutes / 60)}h`} label="Volunteered" />
          </View>
        </View>
      )}

      {/* Badges */}
      {badges && badges.earned.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Badges ({badges.earned.length})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Badges')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.badgesRow}>
              {badges.earned.slice(0, 8).map(({ badge, earnedAt }) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <View
                    style={[
                      styles.badgeIcon,
                      badge.rarity === 'LEGENDARY' && styles.badgeLegendary,
                      badge.rarity === 'EPIC' && styles.badgeEpic,
                      badge.rarity === 'RARE' && styles.badgeRare,
                    ]}
                  >
                    <Text style={styles.badgeEmoji}>{badge.iconUrl.length <= 4 ? badge.iconUrl : '🏅'}</Text>
                  </View>
                  <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate(item.screen)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
              {i < MENU_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const MENU_ITEMS = [
  { icon: '📋', label: 'My Activity', screen: 'MyRequests' },
  { icon: '🔔', label: 'Notifications', screen: 'Notifications' },
  { icon: '⚙️', label: 'Settings', screen: 'Settings' },
];

const StatCard: React.FC<{ emoji: string; value: string | number; label: string }> = ({
  emoji, value, label,
}) => (
  <View style={statStyles.card}>
    <Text style={statStyles.emoji}>{emoji}</Text>
    <Text style={statStyles.value}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  emoji: { fontSize: 24, marginBottom: spacing.xs },
  value: { fontSize: 22, fontWeight: '800', color: colors.gray900 },
  label: { ...typography.caption, color: colors.gray400, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  settingsButton: {
    alignSelf: 'flex-end',
    padding: spacing.sm,
  },
  settingsIcon: { fontSize: 22 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.md,
  },
  avatarFallback: {
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: colors.white },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  bio: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  location: { ...typography.caption, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.md },
  verificationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  verifiedChip: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  verifiedText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  skillChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skillText: { ...typography.caption, color: 'rgba(255,255,255,0.9)' },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: { ...typography.heading4, color: colors.gray800, marginBottom: spacing.md },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAll: { ...typography.label, color: colors.primary },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badgesRow: { flexDirection: 'row', gap: spacing.md, paddingRight: spacing.lg },
  badgeItem: { alignItems: 'center', width: 72 },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeLegendary: { backgroundColor: '#FFD700' + '30', borderWidth: 2, borderColor: '#FFD700' },
  badgeEpic: { backgroundColor: colors.primary + '20', borderWidth: 2, borderColor: colors.primary },
  badgeRare: { backgroundColor: colors.info + '20', borderWidth: 2, borderColor: colors.info },
  badgeEmoji: { fontSize: 26 },
  badgeName: { ...typography.caption, color: colors.gray600, textAlign: 'center' },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { ...typography.bodyLg, color: colors.gray700, flex: 1 },
  menuChevron: { fontSize: 20, color: colors.gray300 },
  menuDivider: { height: 1, backgroundColor: colors.gray100, marginLeft: spacing.xxxl + spacing.md },
  logoutButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.error + '15',
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  logoutText: { ...typography.button, color: colors.error },
});
