import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, shadows, typography, categoryEmoji, urgencyConfig } from '../../theme';
import type { HelpRequest } from '../../store/slices/requestsSlice';

interface Props {
  request: HelpRequest;
  onPress: (request: HelpRequest) => void;
  onAccept?: (request: HelpRequest) => void;
  compact?: boolean;
}


export const RequestCard: React.FC<Props> = ({ request, onPress, onAccept, compact }) => {
  const urgency = urgencyConfig[request.urgency] ?? urgencyConfig.MEDIUM;
  const emoji = categoryEmoji[request.category] ?? '🤝';
  const catColor = colors.categories[request.category] ?? colors.gray400;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(request);
  }, [request, onPress]);

  const handleAccept = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation?.();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onAccept?.(request);
    },
    [request, onAccept]
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Help request: ${request.title}`}
    >
      {/* Urgency strip */}
      {request.urgency === 'EMERGENCY' && (
        <View style={styles.emergencyStrip}>
          <Text style={styles.emergencyText}>🚨 EMERGENCY</Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={[styles.categoryChip, { backgroundColor: catColor + '20' }]}>
            <Text style={styles.categoryEmoji}>{emoji}</Text>
            <Text style={[styles.categoryLabel, { color: catColor }]}>
              {request.category.replace(/_/g, ' ')}
            </Text>
          </View>

          <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
            <View style={[styles.urgencyDot, { backgroundColor: urgency.color }]} />
            <Text style={[styles.urgencyText, { color: urgency.color }]}>
              {urgency.label}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
          {request.title}
        </Text>

        {!compact && (
          <Text style={styles.description} numberOfLines={2}>
            {request.description}
          </Text>
        )}

        {/* Meta row */}
        <View style={styles.metaRow}>
          <MetaBadge icon="⏱" label={`${request.estimatedMinutes} min`} />
          {request.distance !== null && request.distance !== undefined && (
            <MetaBadge icon="📍" label={`${request.distance.toFixed(1)} km`} />
          )}
          <MetaBadge icon="⚡" label={`${request.rewardPoints} XP`} highlight />
          {request.expiresAt && (() => {
            const msLeft = new Date(request.expiresAt!).getTime() - Date.now();
            if (msLeft <= 0) return null;
            const hLeft = Math.floor(msLeft / 3600000);
            const label = hLeft < 1 ? '<1h left' : hLeft < 24 ? `${hLeft}h left` : `${Math.floor(hLeft / 24)}d left`;
            return <MetaBadge icon="⏰" label={label} />;
          })()}
        </View>

        {/* Author row */}
        <View style={styles.authorRow}>
          {request.author.profile?.avatarUrl?.startsWith('emoji://') ? (
            <View style={[styles.avatar, styles.avatarEmoji]}>
              <Text style={{ fontSize: 22 }}>{request.author.profile.avatarUrl.replace('emoji://', '')}</Text>
            </View>
          ) : (
            <Image
              source={request.author.profile?.avatarUrl ? { uri: request.author.profile.avatarUrl } : undefined}
              style={styles.avatar}
            />
          )}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName} numberOfLines={1}>
              {request.author.profile?.displayName ?? 'Anonymous'}
            </Text>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>
                ⭐ {request.author.profile?.avgRating.toFixed(1) ?? '—'}
              </Text>
              {request.author.verificationLevel === 'ID_VERIFIED' && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ Verified</Text>
                </View>
              )}
              {request.author.gamification && (
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Lv{request.author.gamification.level}</Text>
                </View>
              )}
            </View>
          </View>

          {onAccept && request.status === 'OPEN' && (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptText}>Help</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const MetaBadge: React.FC<{ icon: string; label: string; highlight?: boolean }> = ({
  icon,
  label,
  highlight,
}) => (
  <View style={[styles.metaBadge, highlight && styles.metaBadgeHighlight]}>
    <Text style={styles.metaIcon}>{icon}</Text>
    <Text style={[styles.metaLabel, highlight && styles.metaLabelHighlight]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  emergencyStrip: {
    backgroundColor: colors.urgencyEmergency,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  emergencyText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
  body: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  categoryEmoji: { fontSize: 13 },
  categoryLabel: { ...typography.caption, fontWeight: '600' },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  urgencyDot: { width: 6, height: 6, borderRadius: 3 },
  urgencyText: { ...typography.caption, fontWeight: '700' },
  title: {
    ...typography.heading4,
    color: colors.gray800,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.gray500,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radius.sm,
    gap: spacing.xxs,
  },
  metaBadgeHighlight: { backgroundColor: colors.primary + '15' },
  metaIcon: { fontSize: 12 },
  metaLabel: { ...typography.caption, color: colors.gray600 },
  metaLabelHighlight: { color: colors.primary, fontWeight: '700' },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray200,
  },
  avatarEmoji: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInfo: { flex: 1 },
  authorName: { ...typography.label, color: colors.gray700 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  ratingText: { ...typography.caption, color: colors.gray500 },
  verifiedBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  verifiedText: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  levelBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  levelText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    ...shadows.colored(colors.primary),
  },
  acceptText: {
    ...typography.button,
    color: colors.white,
    fontSize: 13,
  },
});
