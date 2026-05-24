import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { usersAPI } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  /** The person being rated */
  recipientId: string;
  recipientName: string;
  requestId: string;
  /** Role context shown in the UI */
  roleLabel?: string;
}

const QUICK_TAGS = ['Friendly', 'Reliable', 'On time', 'Helpful', 'Great attitude', 'Went above & beyond'];

export const RatingModal: React.FC<Props> = ({
  visible, onClose, onSubmitted, recipientId, recipientName, requestId, roleLabel,
}) => {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (stars === 0) return;
    setSubmitting(true);
    try {
      await usersAPI.rateUser({
        requestId,
        recipientId,
        score: stars,
        comment: comment.trim() || undefined,
        tags: selectedTags,
      });
      setSubmitted(true);
      setTimeout(() => {
        onSubmitted();
        // Reset state
        setStars(0);
        setComment('');
        setSelectedTags([]);
        setSubmitted(false);
      }, 1500);
    } catch {
      // Silent fail — rating is optional
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.sheet}>
          {submitted ? (
            <View style={s.successContainer}>
              <Text style={s.successEmoji}>⭐</Text>
              <Text style={s.successTitle}>Rating Submitted!</Text>
              <Text style={s.successSub}>Thank you for your feedback.</Text>
            </View>
          ) : (
            <>
              <View style={s.handle} />
              <Text style={s.heading}>Rate {roleLabel ?? 'your experience'}</Text>
              <Text style={s.subHeading}>
                How was your experience with{' '}
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{recipientName}</Text>?
              </Text>

              {/* Stars */}
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setStars(n)} style={s.starBtn}>
                    <Text style={[s.star, n <= stars && s.starFilled]}>
                      {n <= stars ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {stars > 0 && (
                <Text style={s.starLabel}>
                  {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][stars]}
                </Text>
              )}

              {/* Quick tags */}
              <View style={s.tagsRow}>
                {QUICK_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[s.tag, active && s.tagActive]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text style={[s.tagText, active && s.tagTextActive]}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Comment */}
              <TextInput
                style={s.commentInput}
                placeholder="Add a comment (optional)..."
                placeholderTextColor={colors.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={300}
              />

              {/* Buttons */}
              <View style={s.actions}>
                <TouchableOpacity style={s.skipBtn} onPress={onClose}>
                  <Text style={s.skipText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.submitBtn, stars === 0 && s.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={stars === 0 || submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.submitText}>Submit Rating</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl + spacing.md,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: spacing.xl,
  },
  heading: {
    fontSize: 22, fontWeight: '800', color: colors.text,
    textAlign: 'center', marginBottom: spacing.sm,
  },
  subHeading: {
    fontSize: 14, color: colors.textMuted,
    textAlign: 'center', marginBottom: spacing.xl,
  },
  starsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: spacing.sm, marginBottom: spacing.sm,
  },
  starBtn: { padding: spacing.sm },
  star: { fontSize: 40, color: colors.border },
  starFilled: { color: '#F6AD55' },
  starLabel: {
    textAlign: 'center', fontSize: 14, fontWeight: '700',
    color: '#F6AD55', marginBottom: spacing.xl,
  },
  tagsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm, marginBottom: spacing.lg,
  },
  tag: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2,
    borderRadius: radius.full, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.background,
  },
  tagActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  tagText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tagTextActive: { color: colors.primary },
  commentInput: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: spacing.xl,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
  skipBtn: {
    flex: 1, paddingVertical: spacing.md,
    borderRadius: radius.xl, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center',
  },
  skipText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  submitBtn: {
    flex: 2, paddingVertical: spacing.md,
    borderRadius: radius.xl, backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  successContainer: { alignItems: 'center', paddingVertical: spacing.xxxl },
  successEmoji: { fontSize: 56, marginBottom: spacing.lg },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  successSub: { fontSize: 14, color: colors.textMuted },
});
