import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchFeed, HelpRequest } from '../../store/slices/requestsSlice';
import { matchesAPI } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, shadows } from '../../theme';
import { formatDistanceToNow } from '../../utils/time';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const CATEGORIES = [
  { id: 'ALL', label: 'All', emoji: '🌐' },
  { id: 'ELDERLY_ASSISTANCE', label: 'Elderly Help', emoji: '👴' },
  { id: 'TUTORING', label: 'Tutoring', emoji: '📚' },
  { id: 'FOOD_DELIVERY', label: 'Food', emoji: '🍕' },
  { id: 'COMMUNITY_CLEANUP', label: 'Cleanup', emoji: '🌿' },
  { id: 'PET_HELP', label: 'Pets', emoji: '🐾' },
  { id: 'TECH_SUPPORT', label: 'Tech', emoji: '💻' },
  { id: 'TRANSPORTATION', label: 'Transport', emoji: '🚗' },
  { id: 'EMERGENCY', label: 'Emergency', emoji: '🚨' },
];
const URGENCIES = [
  { id: 'ALL', label: 'All urgency', color: '#9A8878' },
  { id: 'LOW', label: '🟢 Low', color: '#10B981' },
  { id: 'MEDIUM', label: '🟡 Medium', color: '#F6AD55' },
  { id: 'HIGH', label: '🔴 High', color: '#FC8181' },
  { id: 'EMERGENCY', label: '🚨 Emergency', color: '#EF233C' },
];
const SORTS = [
  { id: 'distance', label: '📍 Closest first' },
  { id: 'newest', label: '🕐 Newest first' },
  { id: 'points', label: '⚡ Most XP first' },
];

const CATEGORY_EMOJI: Record<string, string> = {
  ELDERLY_ASSISTANCE: '👴', TUTORING: '📚', FOOD_DELIVERY: '🍕',
  COMMUNITY_CLEANUP: '🌿', PET_HELP: '🐾', TECH_SUPPORT: '💻',
  TRANSPORTATION: '🚗', EMERGENCY: '🚨', OTHER: '🤝',
};
const URGENCY_COLORS: Record<string, string> = {
  LOW: '#10B981', MEDIUM: '#F6AD55', HIGH: '#FC8181', EMERGENCY: '#EF233C',
};

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

interface Filters {
  category: string;
  urgency: string;
  sort: string;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  usePushNotifications(); // Register for push notifications on first authenticated render
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { feed, feedMeta, isLoading, isRefreshing, isLoadingMore } = useAppSelector(s => s.requests);
  const { user } = useAppSelector(s => s.auth);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<Filters>({ category: 'ALL', urgency: 'ALL', sort: 'distance' });
  const [pendingFilters, setPendingFilters] = useState<Filters>({ category: 'ALL', urgency: 'ALL', sort: 'distance' });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  const loadFeed = useCallback((refresh = false, overrideFilters?: Filters) => {
    const f = overrideFilters ?? filters;
    dispatch(fetchFeed({
      lat: location?.lat, lng: location?.lng,
      category: f.category !== 'ALL' ? f.category : undefined,
      urgency: f.urgency !== 'ALL' ? f.urgency : undefined,
      sort: f.sort as any,
      page: 1, refresh: true,
    }));
  }, [location, filters, dispatch]);

  useEffect(() => { loadFeed(true); }, [location]);

  const onRefresh = useCallback(() => { loadFeed(true); }, [loadFeed]);

  const loadMore = useCallback(() => {
    if (feedMeta.hasMore && !isLoadingMore) {
      const f = filters;
      dispatch(fetchFeed({
        lat: location?.lat, lng: location?.lng,
        category: f.category !== 'ALL' ? f.category : undefined,
        urgency: f.urgency !== 'ALL' ? f.urgency : undefined,
        sort: f.sort as any,
        page: feedMeta.page + 1,
      }));
    }
  }, [feedMeta, isLoadingMore, location, filters, dispatch]);

  const applyFilters = () => {
    setFilters(pendingFilters);
    setShowFilter(false);
    loadFeed(true, pendingFilters);
  };

  const resetFilters = () => {
    const def: Filters = { category: 'ALL', urgency: 'ALL', sort: 'distance' };
    setPendingFilters(def);
    setFilters(def);
    setShowFilter(false);
    loadFeed(true, def);
  };

  const activeFilterCount = (filters.category !== 'ALL' ? 1 : 0) + (filters.urgency !== 'ALL' ? 1 : 0) + (filters.sort !== 'distance' ? 1 : 0);

  const handleAccept = useCallback(async (request: HelpRequest) => {
    if (acceptingId) return;
    setAcceptingId(request.id);
    try {
      await matchesAPI.accept(request.id);
      navigation.navigate('RequestDetail', { requestId: request.id });
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Could not accept this request.');
    } finally {
      setAcceptingId(null);
    }
  }, [acceptingId, navigation]);

  const name = (user as any)?.profile?.displayName?.split(' ')[0] ?? 'there';

  const renderHeader = () => (
    <View>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>Hello, {name} 👋</Text>
          <Text style={[styles.greetingSub, { color: colors.textMuted }]}>
            {feedMeta.total} request{feedMeta.total !== 1 ? 's' : ''} nearby
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: activeFilterCount > 0 ? colors.primary : colors.border }]}
          onPress={() => { setPendingFilters(filters); setShowFilter(true); }}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick action cards */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionPrimary, { backgroundColor: colors.primary }, shadows.colored(colors.primary)]}
          onPress={() => navigation.navigate('CreateRequest')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionEmoji}>🆘</Text>
          <Text style={styles.actionTitle}>I Need Help</Text>
          <Text style={styles.actionSub}>Post a request</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Activity')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionEmoji}>📋</Text>
          <Text style={[styles.actionTitleDark, { color: colors.text }]}>My Activity</Text>
          <Text style={[styles.actionSub, { color: colors.textMuted }]}>Posts & helping</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Requests near you</Text>
        {activeFilterCount > 0 && (
          <TouchableOpacity onPress={resetFilters}>
            <Text style={[styles.clearFilters, { color: colors.primary }]}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCard = ({ item }: { item: HelpRequest }) => {
    const urgencyColor = URGENCY_COLORS[item.urgency] ?? colors.textMuted;
    const isAccepting = acceptingId === item.id;
    const isOwn = (item as any).author?.id === (user as any)?.id;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
        activeOpacity={0.8}
      >
        <View style={[styles.urgencyBar, { backgroundColor: urgencyColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>{CATEGORY_EMOJI[item.category] ?? '🤝'}</Text>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
              <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                {(item as any).distance != null ? `${(item as any).distance} km · ` : ''}
                {formatDistanceToNow(item.createdAt)}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
          <View style={styles.cardFooter}>
            <View style={[styles.urgencyTag, { borderColor: urgencyColor }]}>
              <Text style={[styles.urgencyTagText, { color: urgencyColor }]}>{item.urgency}</Text>
            </View>
            <Text style={[styles.xpText, { color: colors.primary }]}>+{item.rewardPoints} XP</Text>
          </View>
          {!isOwn && item.status === 'OPEN' && (
            <TouchableOpacity
              style={[styles.helpBtn, { backgroundColor: colors.primary }, isAccepting && styles.helpBtnBusy]}
              onPress={() => handleAccept(item)}
              disabled={!!acceptingId}
            >
              {isAccepting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.helpBtnText}>✋  I'll Help!</Text>}
            </TouchableOpacity>
          )}
          {isOwn && (
            <View style={[styles.ownTag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.ownTagText, { color: colors.primary }]}>Your request</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading && feed.length === 0 ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌟</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No requests nearby</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Be the first — post a request!
              </Text>
              <TouchableOpacity
                style={[styles.postBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CreateRequest')}
              >
                <Text style={styles.postBtnText}>Post a Request</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} /> : null}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilter(false)} />
        <View style={[styles.filterSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.filterHandle} />
          <Text style={[styles.filterTitle, { color: colors.text }]}>Filter Requests</Text>

          {/* Category */}
          <Text style={[styles.filterGroup, { color: colors.textMuted }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip,
                    { backgroundColor: pendingFilters.category === c.id ? colors.primary : colors.card,
                      borderColor: pendingFilters.category === c.id ? colors.primary : colors.border }]}
                  onPress={() => setPendingFilters(f => ({ ...f, category: c.id }))}
                >
                  <Text style={styles.chipEmoji}>{c.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: pendingFilters.category === c.id ? '#fff' : colors.text }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Urgency */}
          <Text style={[styles.filterGroup, { color: colors.textMuted }]}>Urgency</Text>
          <View style={styles.filterRow}>
            {URGENCIES.map(u => (
              <TouchableOpacity
                key={u.id}
                style={[styles.filterPill,
                  { backgroundColor: pendingFilters.urgency === u.id ? colors.primary + '25' : colors.card,
                    borderColor: pendingFilters.urgency === u.id ? colors.primary : colors.border }]}
                onPress={() => setPendingFilters(f => ({ ...f, urgency: u.id }))}
              >
                <Text style={[styles.filterPillText, { color: pendingFilters.urgency === u.id ? colors.primary : colors.text }]}>{u.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sort */}
          <Text style={[styles.filterGroup, { color: colors.textMuted }]}>Sort by</Text>
          <View style={styles.filterRow}>
            {SORTS.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.filterPill,
                  { backgroundColor: pendingFilters.sort === s.id ? colors.primary + '25' : colors.card,
                    borderColor: pendingFilters.sort === s.id ? colors.primary : colors.border }]}
                onPress={() => setPendingFilters(f => ({ ...f, sort: s.id }))}
              >
                <Text style={[styles.filterPillText, { color: pendingFilters.sort === s.id ? colors.primary : colors.text }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.filterActions}>
            <TouchableOpacity style={[styles.filterResetBtn, { borderColor: colors.border }]} onPress={resetFilters}>
              <Text style={[styles.filterResetText, { color: colors.textMuted }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterApplyBtn, { backgroundColor: colors.primary }]} onPress={applyFilters}>
              <Text style={styles.filterApplyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  greeting: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  greetingSub: { fontSize: 15 },
  filterBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, ...shadows.sm,
  },
  filterIcon: { fontSize: 20 },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  actions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  actionPrimary: { flex: 1, borderRadius: radius.xl, padding: spacing.lg, minHeight: 110, justifyContent: 'space-between' },
  actionSecondary: { flex: 1, borderRadius: radius.xl, padding: spacing.lg, minHeight: 110, justifyContent: 'space-between', borderWidth: 1 },
  actionEmoji: { fontSize: 26 },
  actionTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  actionTitleDark: { fontSize: 15, fontWeight: '800' },
  actionSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  sectionLabel: { fontSize: 18, fontWeight: '800' },
  clearFilters: { fontSize: 14, fontWeight: '600' },
  card: { flexDirection: 'row', marginHorizontal: spacing.xl, marginBottom: spacing.md, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, ...shadows.sm },
  urgencyBar: { width: 6 },
  cardContent: { flex: 1, padding: spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  cardEmoji: { fontSize: 26, lineHeight: 32 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  cardMeta: { fontSize: 13, marginTop: 2 },
  cardDesc: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  urgencyTag: { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  urgencyTagText: { fontSize: 11, fontWeight: '700' },
  xpText: { fontSize: 13, fontWeight: '700' },
  helpBtn: { borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  helpBtnBusy: { opacity: 0.6 },
  helpBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ownTag: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, alignSelf: 'flex-start', marginTop: spacing.xs },
  ownTagText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xxxl },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: spacing.sm },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  postBtn: { paddingHorizontal: spacing.xxxl, paddingVertical: spacing.md + 2, borderRadius: radius.full },
  postBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  filterSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0,
    paddingBottom: 40,
  },
  filterHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#666', alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  filterTitle: { fontSize: 18, fontWeight: '800', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  filterGroup: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5 },
  chipEmoji: { fontSize: 15 },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  filterPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5 },
  filterPillText: { fontSize: 13, fontWeight: '600' },
  filterActions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  filterResetBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, alignItems: 'center' },
  filterResetText: { fontSize: 15, fontWeight: '700' },
  filterApplyBtn: { flex: 2, paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  filterApplyText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
