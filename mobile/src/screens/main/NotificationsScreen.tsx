import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchNotifications, markRead, markAllRead } from '../../store/slices/notificationsSlice';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme';
import { formatDistanceToNow } from '../../utils/time';

const TYPE_ICON: Record<string, string> = {
  MATCH_ACCEPTED: '🤝',
  MATCH_STARTED: '▶️',
  MATCH_COMPLETED: '✅',
  MATCH_APPROVED: '🏆',
  MATCH_CANCELLED: '❌',
  NEW_MESSAGE: '💬',
  NEW_RATING: '⭐',
  XP_EARNED: '⚡',
  BADGE_EARNED: '🏅',
  SYSTEM: '📢',
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const { items, isLoading, unreadCount } = useAppSelector((s) => s.notifications);

  useEffect(() => {
    dispatch(fetchNotifications(1));
  }, []);

  const onRefresh = useCallback(() => {
    dispatch(fetchNotifications(1));
  }, [dispatch]);

  const handleMarkAll = () => {
    dispatch(markAllRead());
  };

  const handleTapNotif = (item: any) => {
    if (!item.isRead) dispatch(markRead(item.id));
    // Navigate to related content
    if (item.metadata?.requestId) {
      navigation.navigate('RequestDetail', { requestId: item.metadata.requestId });
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const icon = TYPE_ICON[item.type] ?? '🔔';
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[s.item, isUnread && s.itemUnread]}
        onPress={() => handleTapNotif(item)}
        activeOpacity={0.75}
      >
        <View style={[s.iconCircle, isUnread && { backgroundColor: colors.primary + '25' }]}>
          <Text style={s.iconEmoji}>{icon}</Text>
        </View>
        <View style={s.itemContent}>
          <Text style={[s.itemTitle, isUnread && { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.body && (
            <Text style={s.itemBody} numberOfLines={2}>{item.body}</Text>
          )}
          <Text style={s.itemTime}>{formatDistanceToNow(item.createdAt)}</Text>
        </View>
        {isUnread && <View style={s.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAll} style={s.markAllBtn}>
            <Text style={s.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {isLoading && items.length === 0 ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🔔</Text>
              <Text style={s.emptyTitle}>All caught up!</Text>
              <Text style={s.emptySubtitle}>
                You'll see updates about your tasks, matches, and messages here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  markAllBtn: { paddingHorizontal: spacing.sm },
  markAllText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  itemUnread: { backgroundColor: colors.surface },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 20 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, lineHeight: 21 },
  itemBody: { fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  itemTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary, marginTop: 6, flexShrink: 0,
  },
  separator: { height: 1, backgroundColor: colors.border },
  empty: {
    alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xxxl,
  },
  emptyIcon: { fontSize: 52, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptySubtitle: {
    fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22,
  },
});
