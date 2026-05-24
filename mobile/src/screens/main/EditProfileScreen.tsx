import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store';
import { restoreSession } from '../../store/slices/authSlice';
import { usersAPI } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme';

const AVAILABLE_SKILLS = [
  'DRIVING', 'COOKING', 'TECH_SUPPORT', 'TUTORING', 'ELDERLY_CARE',
  'PET_CARE', 'GARDENING', 'MOVING', 'CLEANING', 'LANGUAGE_SUPPORT',
  'MEDICAL_KNOWLEDGE', 'CHILD_CARE', 'MUSIC', 'FITNESS', 'HANDYMAN',
];

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const user = useAppSelector((s) => s.auth.user) as any;
  const s = makeStyles(colors);

  const [displayName, setDisplayName] = useState(user?.profile?.displayName ?? '');
  const [bio, setBio] = useState(user?.profile?.bio ?? '');
  const [city, setCity] = useState(user?.profile?.city ?? '');
  const [skills, setSkills] = useState<string[]>(user?.profile?.skills ?? []);
  const [saving, setSaving] = useState(false);

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill].slice(0, 8)
    );
  };

  const handleSave = async () => {
    if (displayName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Display name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      await usersAPI.updateProfile({ displayName: displayName.trim(), bio: bio.trim(), city: city.trim(), skills });
      await dispatch(restoreSession());
      Alert.alert('Saved! ✅', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error ?? 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} style={s.saveBtn} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={s.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {/* Display Name */}
          <Text style={s.label}>Display Name *</Text>
          <TextInput
            style={s.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            maxLength={50}
          />

          {/* Bio */}
          <Text style={s.label}>Bio</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell the community a bit about yourself..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={300}
            numberOfLines={4}
          />
          <Text style={s.charCount}>{bio.length}/300</Text>

          {/* City */}
          <Text style={s.label}>City</Text>
          <TextInput
            style={s.input}
            value={city}
            onChangeText={setCity}
            placeholder="e.g. San Francisco"
            placeholderTextColor={colors.textMuted}
            maxLength={100}
          />

          {/* Skills */}
          <Text style={s.label}>Skills (up to 8)</Text>
          <Text style={s.subLabel}>Select skills you can offer to help others</Text>
          <View style={s.skillsGrid}>
            {AVAILABLE_SKILLS.map((skill) => {
              const selected = skills.includes(skill);
              return (
                <TouchableOpacity
                  key={skill}
                  style={[s.skillChip, selected && s.skillChipSelected]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text style={[s.skillText, selected && s.skillTextSelected]}>
                    {skill.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save button at bottom */}
          <TouchableOpacity style={[s.submitBtn, saving && s.submitBtnDisabled]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitText}>Save Changes</Text>}
          </TouchableOpacity>
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
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  saveBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  saveText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  label: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  subLabel: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, marginTop: -spacing.sm + 2 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  charCount: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skillChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  skillChipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  skillText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  skillTextSelected: { color: colors.primary },
  submitBtn: {
    marginTop: spacing.xxxl,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
