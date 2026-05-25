import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAppSelector } from '../../store';
import { requestsAPI, matchesAPI } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, shadows } from '../../theme';
import { formatDistanceToNow } from '../../utils/time';
import { RatingModal } from '../../components/modals/RatingModal';

type RouteParams = { requestId: string };

const URGENCY_COLORS: Record<string, string> = {
  LOW: '#10B981', MEDIUM: '#F6AD55', HIGH: '#FC8181', EMERGENCY: '#EF233C',
};
const CATEGORY_EMOJI: Record<string, string> = {
  ELDERLY_ASSISTANCE: '👴', TUTORING: '📚', FOOD_DELIVERY: '🍕',
  COMMUNITY_CLEANUP: '🧹', PET_HELP: '🐾', TECH_SUPPORT: '💻',
  TRANSPORTATION: '🚗', EMERGENCY: '🚨', OTHER: '🤝',
};

// Helper: get the current user's match for this request
function findMyMatch(request: any, myId: string) {
  return request?.matches?.find((m: any) =>
    ['ACCEPTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED'].includes(m.status) &&
    m.volunteer?.id === myId
  ) ?? null;
}

export default function RequestDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { requestId } = route.params;
  const { colors } = useTheme();
  const currentUser = useAppSelector((s) => s.auth.user) as any;

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{ id: string; name: string; role: string } | null>(null);

  const load = async () => {
    try {
      const res = await requestsAPI.getById(requestId);
      setRequest(res.data.data);
    } catch {
      Alert.alert('Error', 'Could not load request');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [requestId]);

  const isOwn = request?.author?.id === currentUser?.id;
  const myMatch = !isOwn ? findMyMatch(request, currentUser?.id) : null;
  const urgencyColor = URGENCY_COLORS[request?.urgency] ?? '#9A8878';
  const emoji = CATEGORY_EMOJI[request?.category] ?? '🤝';

  // ── Volunteer actions ──────────────────────────────
  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await matchesAPI.accept(requestId);
      await load();
    } catch (e: any) {
      const details = e.response?.data?.details;
      // Background check gate: redirect to the BackgroundCheckScreen
      if (e.response?.status === 403 && details?.requiresBackgroundCheck) {
        const statusMsg: Record<string, string> = {
          not_started: 'You need to complete a background check before volunteering.',
          pending:     'Your background check is still being processed. Please check back soon.',
          in_progress: 'Your background check is still being processed. Please check back soon.',
          consider:    'Your background check requires additional review. Our team will contact you.',
          expired:     'Your background check has expired. Please submit a new one.',
          failed:      'There was an issue with your background check. Please re-submit.',
        };
        const msg = statusMsg[details.checkStatus ?? ''] ?? 'A background check is required to volunteer.';

        Alert.alert(
          '🔍 Background Check Required',
          msg,
          [
            { text: 'Cancel', style: 'cancel' },
            ...(
              ['not_started', 'expired', 'failed'].includes(details.checkStatus ?? '')
                ? [{ text: 'Start Check', onPress: () => navigation.navigate('BackgroundCheck') }]
                : []
            ),
          ]
        );
        return;
      }
      Alert.alert('Error', e.response?.data?.error ?? 'Could not accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async () => {
    if (!myMatch) return;
    setActionLoading(true);
    try {
      await matchesAPI.start(myMatch.id);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error ?? 'Could not start task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDone = async () => {
    if (!myMatch) return;
    Alert.alert(
      'Mark as Done?',
      'This will notify the requester to approve your completion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "Yes, I'm Done",
          onPress: async () => {
            setActionLoading(true);
            try {
              await matchesAPI.requestCompletion(myMatch.id);
              await load();
              Alert.alert('Done! 🎉', 'The requester has been notified to approve your completion.');
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.error ?? 'Could not mark as done');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Requester actions ─────────────────────────────
  const handleApprove = async () => {
    // Find the match in PENDING_APPROVAL state
    const pendingMatch = request?.matches?.find((m: any) => m.status === 'PENDING_APPROVAL');
    if (!pendingMatch) return;
    Alert.alert(
      'Approve Completion?',
      'Confirm the task is done. The volunteer will receive their XP reward.',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Approve ✅',
          onPress: async () => {
            setActionLoading(true);
            try {
              await matchesAPI.approveCompletion(pendingMatch.id);
              await load();
              Alert.alert('Approved! 🎉', 'The task is complete. Thank you for using QuickHelp!');
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.error ?? 'Could not approve');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Cancel request (requester, OPEN only) ─────────
  const handleCancel = () => {
    Alert.alert(
      'Cancel Request?',
      'Are you sure you want to cancel this request? This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await requestsAPI.cancel(requestId);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.error ?? 'Could not cancel request');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Open rating modal ──────────────────────────────
  const openRating = (recipientId: string, recipientName: string, role: string) => {
    setRatingTarget({ id: recipientId, name: recipientName, role });
    setShowRating(true);
  };

  // ── Determine footer state ────────────────────────
  const renderFooter = () => {
    if (!request) return null;

    const status = request.status;
    const pendingMatch = request?.matches?.find((m: any) => m.status === 'PENDING_APPROVAL');

    // REQUESTER view
    if (isOwn) {
      if (pendingMatch) {
        return (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <View style={[styles.pendingBanner, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
              <Text style={[styles.pendingBannerTitle, { color: colors.primary }]}>✋ Volunteer says they're done!</Text>
              <Text style={[styles.pendingBannerSub, { color: colors.textMuted }]}>
                {pendingMatch.volunteer?.profile?.displayName ?? 'Your volunteer'} has marked the task complete.
                Please verify and approve.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#48BB78' }]}
              onPress={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Approve Completion</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
      }
      if (status === 'MATCHED' || status === 'IN_PROGRESS') {
        return (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Chat', { requestId, requestTitle: request.title })}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Open Chat</Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (status === 'COMPLETED') {
        // Find the completed match to rate the volunteer
        const completedMatch = request?.matches?.find((m: any) => m.status === 'COMPLETED');
        return (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <View style={[styles.completedBanner, { backgroundColor: '#48BB7820', borderColor: '#48BB78' }]}>
              <Text style={[styles.completedText, { color: '#48BB78' }]}>✅ Task completed! Thank you.</Text>
            </View>
            {completedMatch?.volunteer && (
              <TouchableOpacity
                style={[styles.actionBtnSecondary, { borderColor: '#F6AD55' }]}
                onPress={() => openRating(
                  completedMatch.volunteer.id,
                  completedMatch.volunteer.profile?.displayName ?? 'Volunteer',
                  'the volunteer'
                )}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#F6AD55' }}>⭐ Rate the Volunteer</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }
      if (status === 'OPEN') {
        return (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.ownNote, { color: colors.textMuted }]}>
              Waiting for a volunteer nearby to accept.
            </Text>
            <TouchableOpacity
              style={[styles.cancelBtn]}
              onPress={handleCancel}
              disabled={actionLoading}
            >
              <Text style={styles.cancelBtnText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return null;
    }

    // VOLUNTEER view
    if (!myMatch) {
      if (status === 'OPEN') {
        return (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleAccept} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="hand-right-outline" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>I'll Help!</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
      }
      return null; // request matched to someone else
    }

    // Volunteer has a match
    if (myMatch.status === 'ACCEPTED') {
      return (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleStart} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="play-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Start Task</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnSecondary, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('Chat', { requestId, requestTitle: request.title })}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnSecondaryText, { color: colors.primary }]}>Chat</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (myMatch.status === 'IN_PROGRESS') {
      return (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#48BB78' }]} onPress={handleMarkDone} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>I'm Done!</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnSecondary, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('Chat', { requestId, requestTitle: request.title })}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnSecondaryText, { color: colors.primary }]}>Chat</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (myMatch.status === 'PENDING_APPROVAL') {
      return (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={[styles.pendingBanner, { backgroundColor: '#F6AD5520', borderColor: '#F6AD55' }]}>
            <Text style={[styles.pendingBannerTitle, { color: '#F6AD55' }]}>⏳ Awaiting approval</Text>
            <Text style={[styles.pendingBannerSub, { color: colors.textMuted }]}>
              The requester has been notified. Waiting for them to approve.
            </Text>
          </View>
        </View>
      );
    }

    if (myMatch.status === 'COMPLETED') {
      return (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={[styles.completedBanner, { backgroundColor: '#48BB7820', borderColor: '#48BB78' }]}>
            <Text style={[styles.completedText, { color: '#48BB78' }]}>✅ Task approved! XP awarded.</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtnSecondary, { borderColor: '#F6AD55' }]}
            onPress={() => openRating(
              request.author.id,
              request.author.profile?.displayName ?? 'Requester',
              'the requester'
            )}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#F6AD55' }}>⭐ Rate the Requester</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!request) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header bar */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Request Detail</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Urgency banner */}
        <View style={[styles.urgencyBanner, { backgroundColor: urgencyColor }]}>
          <Text style={styles.urgencyBannerText}>{request.urgency} URGENCY</Text>
        </View>

        <View style={styles.body}>
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.titleEmoji}>{emoji}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{request.title}</Text>
          </View>

          {/* Chips */}
          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.textMuted }]}>
                {request.category?.replace(/_/g, ' ')}
              </Text>
            </View>
            <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.chipText, { color: colors.textMuted }]}>{request.estimatedMinutes} min</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.chipText, { color: colors.primary, fontWeight: '700' }]}>+{request.rewardPoints} XP</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Details</Text>
          <Text style={[styles.description, { color: colors.text }]}>{request.description}</Text>

          {/* Location */}
          {request.address && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Location</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>{request.address}</Text>
              </View>
            </>
          )}

          {/* Author */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Posted by</Text>
          <View style={[styles.authorRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.authorAvatar, { backgroundColor: colors.primary + '25' }]}>
              <Text style={[styles.authorAvatarText, { color: colors.primary }]}>
                {request.author?.profile?.displayName?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {request.author?.profile?.displayName ?? 'Anonymous'}
              </Text>
              <Text style={[styles.authorMeta, { color: colors.textMuted }]}>
                Lv.{request.author?.gamification?.level ?? 1} · {formatDistanceToNow(request.createdAt)}
              </Text>
            </View>
            {/* Report button — only visible to other users */}
            {!isOwn && request.author?.id && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ReportUser', {
                  userId: request.author.id,
                  userName: request.author?.profile?.displayName ?? 'User',
                })}
                style={styles.reportBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="flag-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: urgencyColor + '20', borderColor: urgencyColor + '50' }]}>
            <Text style={[styles.statusText, { color: urgencyColor }]}>{request.status?.replace(/_/g, ' ')}</Text>
          </View>
        </View>
      </ScrollView>

      {renderFooter()}

      {ratingTarget && (
        <RatingModal
          visible={showRating}
          onClose={() => setShowRating(false)}
          onSubmitted={() => setShowRating(false)}
          recipientId={ratingTarget.id}
          recipientName={ratingTarget.name}
          requestId={requestId}
          roleLabel={ratingTarget.role}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  urgencyBanner: { paddingVertical: 8, alignItems: 'center' },
  urgencyBannerText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  body: { padding: spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg },
  titleEmoji: { fontSize: 34 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', lineHeight: 28 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.lg },
  description: { fontSize: 16, lineHeight: 26 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationText: { fontSize: 14, flex: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.xl, borderWidth: 1 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  authorAvatarText: { fontSize: 18, fontWeight: '800' },
  authorName: { fontSize: 15, fontWeight: '700' },
  authorMeta: { fontSize: 12, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.xl },
  statusText: { fontSize: 13, fontWeight: '700' },
  footer: { padding: spacing.lg, borderTopWidth: 1, gap: spacing.sm },
  actionBtn: { borderRadius: radius.xl, paddingVertical: spacing.md + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadows.sm },
  actionBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  actionBtnSecondary: { borderRadius: radius.xl, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5 },
  actionBtnSecondaryText: { fontSize: 15, fontWeight: '700' },
  pendingBanner: { borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1.5, marginBottom: spacing.sm },
  pendingBannerTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  pendingBannerSub: { fontSize: 14, lineHeight: 20 },
  completedBanner: { borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1.5, alignItems: 'center' },
  completedText: { fontSize: 16, fontWeight: '800' },
  ownNote: { textAlign: 'center', fontSize: 14 },
  reportBtn: { padding: 4, marginLeft: 4 },
  cancelBtn: {
    borderRadius: radius.xl, paddingVertical: spacing.md,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#FC8181',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#FC8181' },
});
