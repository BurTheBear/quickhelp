import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme';
import { usersAPI } from '../../services/api';
import { api } from '../../services/api';
import { useAppDispatch, useAppSelector } from '../../store';
import { restoreSession } from '../../store/slices/authSlice';

const EMOJIS = [
  '🦊','🐻','🦁','🐯','🦝','🦋','🐸','🦜','🐺','🦄',
  '🐉','🐘','🦓','🐼','🦩','🦚','🦅','🦆','🐙','🦑',
  '🐬','🐋','🦈','🦞','🦀','🌻','🌺','🌸','🌼','🍀',
  '⭐','🌟','💫','🔥','🌊','🍁','🌴','🌵','🎭','🎸',
  '🎺','🎻','🎮','🏆','🎯','🎨','🚀','🛸','🌈','💎',
];

type Tab = 'photo' | 'emoji';

export default function AvatarPickerScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);
  const currentAvatar = (user as any)?.profile?.avatarUrl ?? '';

  const [tab, setTab] = useState<Tab>('photo');
  const [selectedEmoji, setSelectedEmoji] = useState<string>(
    currentAvatar.startsWith('emoji://') ? currentAvatar.replace('emoji://', '') : ''
  );
  const [photoUri, setPhotoUri] = useState<string | null>(
    currentAvatar && !currentAvatar.startsWith('emoji://') ? currentAvatar : null
  );
  const [saving, setSaving] = useState(false);
  const s = makeStyles(colors);

  // ── Photo pickers ────────────────────────────────────────────────────────────
  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setTab('photo');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setTab('photo');
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const hasChanges = (tab === 'emoji' && selectedEmoji) || (tab === 'photo' && photoUri);
    if (!hasChanges) {
      Alert.alert('Nothing selected', 'Pick a photo or emoji first.');
      return;
    }

    setSaving(true);
    try {
      if (tab === 'emoji' && selectedEmoji) {
        // Save emoji via updateProfile
        await usersAPI.updateProfile({ avatarUrl: `emoji://${selectedEmoji}` });
      } else if (tab === 'photo' && photoUri) {
        // Upload real photo as multipart to /me/avatar
        const form = new FormData();
        form.append('avatar', {
          uri: photoUri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);
        await api.post('/users/me/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      await dispatch(restoreSession());
      Alert.alert('Saved! ✅', 'Your profile picture has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error ?? 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const canSave = (tab === 'emoji' && !!selectedEmoji) || (tab === 'photo' && !!photoUri);

  return (
    <SafeAreaView style={[s.container]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Profile Picture</Text>
        <TouchableOpacity
          style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {/* Preview */}
      <View style={s.preview}>
        {tab === 'photo' && photoUri ? (
          <Image source={{ uri: photoUri }} style={s.previewPhoto} />
        ) : tab === 'emoji' && selectedEmoji ? (
          <View style={[s.previewPhoto, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 72 }}>{selectedEmoji}</Text>
          </View>
        ) : (
          <View style={[s.previewPhoto, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }]}>
            <Ionicons name="person-circle-outline" size={80} color={colors.textMuted} />
            <Text style={[s.previewHint, { color: colors.textMuted }]}>No photo yet</Text>
          </View>
        )}
      </View>

      {/* Tab bar */}
      <View style={[s.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'photo' && { borderBottomColor: colors.primary }]}
          onPress={() => setTab('photo')}
        >
          <Text style={[s.tabLabel, { color: tab === 'photo' ? colors.primary : colors.textMuted }]}>
            📷 Photo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'emoji' && { borderBottomColor: colors.primary }]}
          onPress={() => setTab('emoji')}
        >
          <Text style={[s.tabLabel, { color: tab === 'emoji' ? colors.primary : colors.textMuted }]}>
            🎭 Emoji Avatar
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'photo' ? (
        <ScrollView contentContainerStyle={s.photoSection}>
          {/* Camera button */}
          <TouchableOpacity style={[s.photoActionBtn, { backgroundColor: colors.primary }]} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={s.photoActionText}>Take a Photo</Text>
          </TouchableOpacity>

          {/* Gallery button */}
          <TouchableOpacity style={[s.photoActionBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]} onPress={pickFromLibrary}>
            <Ionicons name="images" size={24} color={colors.primary} />
            <Text style={[s.photoActionText, { color: colors.primary }]}>Choose from Library</Text>
          </TouchableOpacity>

          {photoUri && (
            <TouchableOpacity style={s.removeBtn} onPress={() => setPhotoUri(null)}>
              <Text style={[s.removeBtnText, { color: colors.error }]}>Remove Photo</Text>
            </TouchableOpacity>
          )}

          <Text style={[s.photoTip, { color: colors.textMuted }]}>
            Tips: Use a clear, well-lit photo of yourself. Square photos work best. Your photo will be visible to other users.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={EMOJIS}
          keyExtractor={item => item}
          numColumns={5}
          contentContainerStyle={s.grid}
          renderItem={({ item }) => {
            const isSelected = item === selectedEmoji;
            return (
              <TouchableOpacity
                style={[
                  s.cell,
                  {
                    backgroundColor: isSelected ? colors.primary + '30' : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedEmoji(item)}
                activeOpacity={0.7}
              >
                <Text style={s.cellEmoji}>{item}</Text>
                {isSelected && (
                  <View style={[s.checkBadge, { backgroundColor: colors.primary }]}>
                    <Text style={s.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
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
  backBtn: { padding: 4, width: 36 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  saveBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.primary, minWidth: 64, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  preview: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  previewPhoto: {
    width: 120, height: 120, borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3, borderColor: colors.primary,
  },
  previewHint: { fontSize: 12, marginTop: spacing.xs },
  tabBar: {
    flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 14, fontWeight: '700' },
  photoSection: {
    padding: spacing.xl, gap: spacing.md,
  },
  photoActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, paddingVertical: spacing.lg,
    borderRadius: radius.xl,
  },
  photoActionText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  removeBtn: { alignItems: 'center', paddingVertical: spacing.md },
  removeBtnText: { fontSize: 14, fontWeight: '600' },
  photoTip: {
    fontSize: 13, lineHeight: 20, textAlign: 'center',
    marginTop: spacing.md,
  },
  grid: { paddingHorizontal: spacing.md, paddingBottom: 40, paddingTop: spacing.md },
  cell: {
    flex: 1, margin: spacing.xs, aspectRatio: 1,
    borderRadius: radius.lg, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  cellEmoji: { fontSize: 30 },
  checkBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
