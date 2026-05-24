import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { leaderboardAPI } from '../../services/api';
import { useAppSelector } from '../../store';
import { colors, spacing, radius, typography, shadows } from '../../theme';

type Tab = 'weekly' | 'monthly' | 'all_time' | 'nearby';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  city?: string;
  tasksCompleted?: number;
  xp: number;
  level: number;
  levelName: string;
}

export const LeaderboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector((s) => s.auth);

  const [tab, setTab] = useState<Tab>('weekly');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      let res;
      switch (tab) {
        case 'weekly': res = await leaderboardAPI.getWeekly(); break;
        case 'monthly': res = await leaderboardAPI.getMonthly(); break;
        case 'nearby': res = await leaderboardAPI.getNearby(); break;
        default: res = await leaderboardAPI.getGlobal();
      }
      setData(res.data.data);
    } catch {}
    setIsLoading(false);
  };

  const myRank = data.findIndex((e) => e.userId === user?.id) + 1;

  const renderPodium = () => {
    if (data.length < 3) return null;
    const [first, second, third] = data;

    return (
      <LinearGradient colors={[colors.primary + 'CC', colors.primaryDark]} style={styles.podium}>
        {/* 2nd place */}
        <PodiumPlace entry={second} place={2} height={100} />
        {/* 1st place */}
        <PodiumPlace entry={first} place={1} height={130} highlight />
        {/* 3rd place */}
        <PodiumPlace entry={third} place={3} height={80} />
      </LinearGradient>
    );
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    if (index < 3) return null; // Shown in podium

    const isMe = item.userId === user?.id;
    return (
      <View style={[styles.row, isMe && styles.rowMe]}>
        <Text style={[styles.rank, index < 9 && styles.rankHighlight]}>#{item.rank}</Text>
        <Image
          source={item.avatarUrl ? { uri: item.avatarUrl } : undefined}
          style={styles.rowAvatar}
        />
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, isMe && styles.rowNameMe]}>{item.displayName ?? 'Anonymous'}</Text>
          <Text style={styles.rowCity}>{item.city ?? ''} · Lv{item.level} {item.levelName}</Text>
        </View>
        <View style={styles.rowXp}>
          <Text style={[styles.xpValue, isMe && styles.xpValueMe]}>
            {item.xp.toLocaleString()}
          </Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
        {myRank > 0 && (
          <View style={styles.myRankChip}>
            <Text style={styles.myRankText}>Your rank: #{myRank}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['weekly', 'monthly', 'all_time', 'nearby'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'all_time' ? 'All Time' : t === 'nearby' ? 'Nearby' : t === 'weekly' ? 'Week' : 'Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.userId}
          ListHeaderComponent={renderPodium}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No data yet. Start helping!</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const PodiumPlace: React.FC<{
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  height: number;
  highlight?: boolean;
}> = ({ entry, place, height, highlight }) => {
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <View style={[podiumStyles.container, highlight && podiumStyles.highlight]}>
      <Text style={podiumStyles.medal}>{medals[place - 1]}</Text>
      <Image
        source={entry.avatarUrl ? { uri: entry.avatarUrl } : undefined}
        style={podiumStyles.avatar}
      />
      <Text style={podiumStyles.name} numberOfLines={1}>{entry.displayName?.split(' ')[0] ?? '—'}</Text>
      <Text style={podiumStyles.xp}>{entry.xp.toLocaleString()} XP</Text>
      <View style={[podiumStyles.bar, { height }]}>
        <Text style={podiumStyles.place}>#{place}</Text>
      </View>
    </View>
  );
};

const podiumStyles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1 },
  highlight: { transform: [{ translateY: -10 }] },
  medal: { fontSize: 24, marginBottom: spacing.xs },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.xs,
  },
  name: { ...typography.caption, color: colors.white, fontWeight: '700', maxWidth: 80 },
  xp: { ...typography.caption, color: 'rgba(255,255,255,0.7)', fontSize: 10, marginBottom: spacing.sm },
  bar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.sm,
    width: 64,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  place: { ...typography.heading4, color: colors.white, fontWeight: '800' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerTitle: { ...typography.heading3, color: colors.gray900 },
  myRankChip: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  myRankText: { ...typography.label, color: colors.primary },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.caption, color: colors.gray500, fontWeight: '600' },
  tabTextActive: { color: colors.white },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadows.sm,
  },
  rowMe: { borderWidth: 2, borderColor: colors.primary },
  rank: {
    ...typography.label,
    color: colors.gray400,
    width: 32,
    textAlign: 'center',
  },
  rankHighlight: { color: colors.primary, fontWeight: '800' },
  rowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray200,
  },
  rowInfo: { flex: 1 },
  rowName: { ...typography.label, color: colors.gray800 },
  rowNameMe: { color: colors.primary },
  rowCity: { ...typography.caption, color: colors.gray400, marginTop: 2 },
  rowXp: { alignItems: 'flex-end' },
  xpValue: { ...typography.label, color: colors.gray700 },
  xpValueMe: { color: colors.primary },
  xpLabel: { ...typography.caption, color: colors.gray400 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { padding: spacing.section, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.gray400 },
});
