import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme';
import { usersAPI } from '../../services/api';

type RouteParams = { userId: string; userName: string };

const REPORT_REASONS = [
  { id: 'NO_SHOW', label: "Didn't show up", emoji: '🚫', description: 'Agreed to help but never arrived or responded' },
  { id: 'AGGRESSIVE', label: 'Aggressive or threatening', emoji: '⚠️', description: 'Used threatening language or behavior' },
  { id: 'INAPPROPRIATE', label: 'Inappropriate behavior', emoji: '🚨', description: 'Acted in an inappropriate or offensive manner' },
  { id: 'SUSPICIOUS', label: 'Suspicious behavior', emoji: '🔍', description: 'Behavior that felt unsafe or suspicious' },
  { id: 'HARASSMENT', label: 'Harassment', emoji: '🛑', description: 'Repeatedly sent unwanted messages or actions' },
  { id: 'SCAM', label: 'Spam or scam', emoji: '💸', description: 'Attempting to scam, spam, or deceive others' },
  { id: 'FAKE_ACCOUNT', label: 'Fake account', emoji: '🎭', description: 'Using a fake identity or impersonating someone' },
  { id: 'OTHER', label: 'Other safety concern', emoji: '📋', description: 'Any other safety or community issue' },
];

export default function ReportUserScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { userId, userName } = route.params;
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = !!selectedReason && !submitting;

  const handleSubmit = async () => {
    if (!selectedReason) return;

    Alert.alert(
      'Submit Report?',
      `You're about to report ${userName}. Our safety team will review this report within 24 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Report',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await usersAPI.reportUser(userId, {
                reason: selectedReason,
                description: description.trim() || `Reported for: ${REPORT_REASONS.find(r => r.id === selectedReason)?.label}`,
              });
              setSubmitted(true);
            } catch (e: any) {
              Alert.alert(
                'Error',
                e.response?.data?.error ?? 'Could not submit report. Please try again.',
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={[s.container]} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Report Submitted</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={s.successContainer}>
          <View style={[s.successIcon, { backgroundColor: '#48BB7820' }]}>
            <Text style={s.successEmoji}>✅</Text>
          </View>
          <Text style={[s.successTitle, { color: colors.text }]}>Report Received</Text>
          <Text style={[s.successBody, { color: colors.textMuted }]}>
            Thank you for helping keep QuickHelp safe. Our safety team will review your report within 24 hours.
          </Text>
          <Text style={[s.successNote, { color: colors.textMuted, backgroundColor: colors.surface }]}>
            🔒 Your report is anonymous. The reported user will not be notified of your identity.
          </Text>
          <TouchableOpacity
            style={[s.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Report form ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.container]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Report User</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Who you're reporting */}
          <View style={[s.targetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.targetAvatar, { backgroundColor: colors.primary + '25' }]}>
              <Text style={[s.targetAvatarText, { color: colors.primary }]}>
                {userName?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.targetLabel, { color: colors.textMuted }]}>Reporting</Text>
              <Text style={[s.targetName, { color: colors.text }]}>{userName}</Text>
            </View>
            <Ionicons name="shield-outline" size={22} color={colors.textMuted} />
          </View>

          {/* Reason heading */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>What's the issue?</Text>
          <Text style={[s.sectionSub, { color: colors.textMuted }]}>
            Select the reason that best describes the problem.
          </Text>

          {/* Reason list */}
          {REPORT_REASONS.map((reason) => {
            const isSelected = selectedReason === reason.id;
            return (
              <TouchableOpacity
                key={reason.id}
                style={[
                  s.reasonCard,
                  {
                    backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedReason(reason.id)}
                activeOpacity={0.7}
              >
                <Text style={s.reasonEmoji}>{reason.emoji}</Text>
                <View style={s.reasonText}>
                  <Text style={[s.reasonLabel, { color: colors.text }]}>{reason.label}</Text>
                  <Text style={[s.reasonDesc, { color: colors.textMuted }]}>{reason.description}</Text>
                </View>
                <View
                  style={[
                    s.radioOuter,
                    { borderColor: isSelected ? colors.primary : colors.border },
                  ]}
                >
                  {isSelected && (
                    <View style={[s.radioInner, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Additional details */}
          <Text style={[s.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>
            Additional details <Text style={[{ color: colors.textMuted, fontSize: 14, fontWeight: '400' }]}>(optional)</Text>
          </Text>
          <TextInput
            style={[s.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Describe what happened in more detail..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
            maxLength={500}
          />
          <Text style={[s.charCount, { color: colors.textMuted }]}>{description.length}/500</Text>

          {/* Safety note */}
          <View style={[s.safetyNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={[s.safetyNoteText, { color: colors.textMuted }]}>
              All reports are reviewed by our safety team. False reports may result in account restrictions.
            </Text>
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[
              s.submitBtn,
              { backgroundColor: canSubmit ? '#EF4444' : colors.border },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="flag" size={18} color="#fff" />
                <Text style={s.submitBtnText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4, width: 32 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { padding: spacing.lg },

  // Target user card
  targetCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1,
    marginBottom: spacing.xl,
  },
  targetAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  targetAvatarText: { fontSize: 18, fontWeight: '800' },
  targetLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  targetName: { fontSize: 16, fontWeight: '700', marginTop: 2 },

  // Section headings
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: spacing.sm },
  sectionSub: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },

  // Reason cards
  reasonCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  reasonEmoji: { fontSize: 22, width: 30 },
  reasonText: { flex: 1 },
  reasonLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  reasonDesc: { fontSize: 13, lineHeight: 18 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 11, height: 11, borderRadius: 5.5 },

  // Text area
  textArea: {
    borderWidth: 1.5, borderRadius: radius.xl,
    padding: spacing.lg, fontSize: 15, lineHeight: 22,
    minHeight: 120,
  },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 6, marginBottom: spacing.xl },

  // Safety note
  safetyNote: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1,
    marginBottom: spacing.xl,
  },
  safetyNoteText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Submit
  submitBtn: {
    borderRadius: radius.xl, paddingVertical: spacing.md + 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
  },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Success
  successContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  successEmoji: { fontSize: 52 },
  successTitle: { fontSize: 26, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center' },
  successBody: { fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: spacing.xl },
  successNote: {
    fontSize: 13, lineHeight: 20, textAlign: 'center',
    padding: spacing.lg, borderRadius: radius.xl, marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  doneBtn: {
    paddingHorizontal: 48, paddingVertical: spacing.md + 2,
    borderRadius: radius.full,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
