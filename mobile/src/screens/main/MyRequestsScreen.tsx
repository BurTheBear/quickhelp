import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { requestsAPI } from '../../services/api';
import { spacing, radius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { formatDistanceToNow } from '../../utils/time';

const URGENCY_COLORS: Record<string, string> = {
  LOW: '#10B981', MEDIUM: '#F6AD55', HIGH: '#FC8181', EMERGENCY: '#EF233C',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  MATCHED: 'Matched',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: '#0D2B1F', text: '#4ECDC4' },
  MATCHED: { bg: '#0D1B2B', text: '#63B3ED' },
  IN_PROGRESS: { bg: '#2B1F0A', text: '#F6AD55' },
  COMPLETED: { bg: '#1A1513', text: '#9A8878' },
  CANCELLED: { bg: '#2B0F0F', text: '#FC8181' },
};

type TabType = 'posted' | 'helping';

export default function MyRequestsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const isModal = route.name === 'MyRequests'; // true when pushed as stack screen
  const [tab, setTab] = useState<TabType>('posted');
  const [posted, setPosted] = useState<any[]>([]);
  const [helping, setHelping] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [madeRes, volunteeredRes] = await Promise.all([
        requestsAPI.getMyRequests('made'),
        requestsAPI.getMyRequests('volunteered'),
      ]);
      setPosted(madeRes.data.data ?? []);
      setHelping(volunteeredRes.data.data ?? []);
    } catch {
      setPosted([]);
      setHelping([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const data = tab === 'posted' ? posted : helping;

  const renderItem = ({ item }: { item: any }) => {
    const urgencyColor = URGENCY_COLORS[item.urgency] ?? colors.textMuted;
    const status = item.matchStatus ?? item.status;
    const statusStyle = STATUS_COLORS[status] ?? STATUS_COLORS.OPEN;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
        activeOpacity={0.75}
      >
        <View style={[styles.urgencyStrip, { backgroundColor: urgencyColor }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {STATUS_LABEL[status] ?? status}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardTime}>{formatDistanceToNow(item.createdAt)}</Text>
            {tab === 'helping' ? (
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => navigation.navigate('Chat', { requestId: item.id, requestTitle: item.title })}
              >
                <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                <Text style={styles.chatBtnText}>Open Chat</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.cardXP}>+{item.rewardPoints} XP</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {isModal ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
        <Text style={styles.title}>My Activity</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'posted' && styles.tabActive]}
          onPress={() => setTab('posted')}
        >
          <Text style={[styles.tabText, tab === 'posted' && styles.tabTextActive]}>
            My Posts ({posted.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'helping' && styles.tabActive]}
          onPress={() => setTab('helping')}
        >
          <Text style={[styles.tabText, tab === 'helping' && styles.tabTextActive]}>
            I'm Helping ({helping.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{tab === 'posted' ? '📋' : '🤝'}</Text>
            <Text style={styles.emptyTitle}>
              {tab === 'posted' ? 'No requests posted yet' : 'Not helping anyone yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'posted'
                ? 'Post a request and volunteers nearby will see it'
                : 'Browse nearby requests and tap "I\'ll Help!" to get started'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate(tab === 'posted' ? 'CreateRequest' : 'Home')}
            >
              <Text style={styles.emptyBtnText}>
                {tab === 'posted' ? 'Post a Request' : 'Browse Requests'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.border },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontWeight: '800', color: c.text },
    tabs: { flexDirection: 'row', margin: spacing.lg, backgroundColor: c.surface, borderRadius: radius.lg, padding: 4 },
    tab: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center' },
    tabActive: { backgroundColor: c.primary },
    tabText: { fontSize: 14, fontWeight: '700', color: c.textMuted },
    tabTextActive: { color: c.white },
    card: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: radius.lg, marginBottom: spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
    urgencyStrip: { width: 5 },
    cardBody: { flex: 1, padding: spacing.md },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
    cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text, marginRight: spacing.sm },
    statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
    statusText: { fontSize: 12, fontWeight: '700' },
    cardDesc: { fontSize: 14, color: c.textMuted, lineHeight: 20, marginBottom: spacing.sm },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTime: { fontSize: 13, color: c.textMuted },
    cardXP: { fontSize: 13, color: c.primary, fontWeight: '700' },
    chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.primary + '20', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    chatBtnText: { fontSize: 13, fontWeight: '700', color: c.primary },
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xxxl },
    emptyIcon: { fontSize: 52, marginBottom: spacing.lg },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: spacing.sm, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
    emptyBtn: { backgroundColor: c.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
    emptyBtnText: { color: c.white, fontWeight: '700', fontSize: 15 },
  });
}
