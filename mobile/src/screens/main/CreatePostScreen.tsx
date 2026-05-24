import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store';
import { createPost } from '../../store/slices/socialSlice';
import { theme } from '../../theme';

type Visibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: string; desc: string }[] = [
  { value: 'PUBLIC', label: 'Everyone', icon: '🌍', desc: 'Anyone can see this post' },
  { value: 'FOLLOWERS', label: 'Followers', icon: '👥', desc: 'Only your followers' },
  { value: 'PRIVATE', label: 'Only me', icon: '🔒', desc: 'Just you' },
];

export default function CreatePostScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const user = useAppSelector((s) => s.auth.user);

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [showVisibility, setShowVisibility] = useState(false);
  const [loading, setLoading] = useState(false);

  const maxChars = 1000;
  const remaining = maxChars - content.length;
  const canPost = content.trim().length > 0 && !loading;

  const handlePost = async () => {
    if (!canPost) return;
    setLoading(true);
    try {
      await dispatch(createPost({ content: content.trim(), visibility })).unwrap();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not create post');
    } finally {
      setLoading(false);
    }
  };

  const selectedVisibility = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!;
  const displayName = (user as any)?.profile?.displayName ?? 'You';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Post</Text>
          <TouchableOpacity
            style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!canPost}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{displayName[0]?.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{displayName}</Text>
              {/* Visibility picker trigger */}
              <TouchableOpacity
                style={styles.visibilityTrigger}
                onPress={() => setShowVisibility(!showVisibility)}
              >
                <Text style={styles.visibilityText}>
                  {selectedVisibility.icon} {selectedVisibility.label}
                </Text>
                <Ionicons
                  name={showVisibility ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Visibility picker */}
          {showVisibility && (
            <View style={styles.visibilityPicker}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.visibilityOption, visibility === opt.value && styles.visibilityOptionActive]}
                  onPress={() => { setVisibility(opt.value); setShowVisibility(false); }}
                >
                  <Text style={styles.visibilityOptionIcon}>{opt.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.visibilityOptionLabel}>{opt.label}</Text>
                    <Text style={styles.visibilityOptionDesc}>{opt.desc}</Text>
                  </View>
                  {visibility === opt.value && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Text input */}
          <TextInput
            style={styles.input}
            placeholder="What's on your mind? Share a volunteer story, ask for tips, or celebrate someone's kindness..."
            placeholderTextColor={theme.colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={maxChars}
            autoFocus
          />

          {/* Char count */}
          <View style={styles.charCount}>
            <View style={[styles.charBar, { width: `${(content.length / maxChars) * 100}%` as any }]} />
            <Text style={[styles.charText, remaining < 50 && { color: remaining < 20 ? '#EF4444' : '#F59E0B' }]}>
              {remaining} characters left
            </Text>
          </View>

          {/* Tip */}
          <View style={styles.tip}>
            <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
            <Text style={styles.tipText}>
              Share your volunteer experience, community events, or ask for help to connect with neighbors!
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 16, color: theme.colors.textMuted },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  postBtn: {
    backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, minWidth: 64, alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  authorRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: '700', color: theme.colors.primary },
  authorName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  visibilityTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
  },
  visibilityText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

  visibilityPicker: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.colors.surface,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  visibilityOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  visibilityOptionActive: { backgroundColor: theme.colors.primary + '0D' },
  visibilityOptionIcon: { fontSize: 20 },
  visibilityOptionLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  visibilityOptionDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },

  input: {
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16,
    fontSize: 16, color: theme.colors.text, lineHeight: 24,
    minHeight: 160, textAlignVertical: 'top',
  },

  charCount: { marginHorizontal: 16, marginBottom: 16 },
  charBar: {
    height: 2, backgroundColor: theme.colors.primary, borderRadius: 1, marginBottom: 6,
  },
  charText: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'right' },

  tip: {
    flexDirection: 'row', gap: 8, margin: 16, padding: 14,
    backgroundColor: theme.colors.primary + '0D', borderRadius: 12, alignItems: 'flex-start',
  },
  tipText: { flex: 1, fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 },
});
