import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image as RNImage,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../../store';
import { createRequest } from '../../store/slices/requestsSlice';
import { requestsAPI } from '../../services/api';
import { Button } from '../../components/common/Button';
import { colors, spacing, radius, typography, shadows, categoryEmoji, urgencyConfig } from '../../theme';

const CATEGORIES = [
  'ELDERLY_ASSISTANCE', 'TUTORING', 'FOOD_DELIVERY', 'COMMUNITY_CLEANUP',
  'PET_HELP', 'TECH_SUPPORT', 'TRANSPORTATION', 'EMERGENCY', 'OTHER',
];

const URGENCIES = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] as const;
const DURATIONS = [5, 15, 30, 45, 60, 90, 120];

interface Props {
  navigation: { goBack: () => void; navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export const CreateRequestScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>('MEDIUM');
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: basics, 2: details, 3: location
  const [photos, setPhotos] = useState<string[]>([]); // local URIs

  useEffect(() => {
    if (useCurrentLocation) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

          // Reverse geocode
          const [geoResult] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geoResult) {
            setAddress(`${geoResult.street ?? ''} ${geoResult.city ?? ''}, ${geoResult.region ?? ''}`);
          }
        }
      })();
    }
  }, [useCurrentLocation]);

  const isValid = title.trim().length >= 5 && description.trim().length >= 10;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to add photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 3)); // max 3 photos
    }
  };

  const removePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    const loc = location ?? { latitude: 37.7749, longitude: -122.4194 };

    const result = await dispatch(
      createRequest({
        title: title.trim(),
        description: description.trim(),
        category,
        urgency,
        estimatedMinutes: duration,
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: address || 'Location not set',
      })
    );

    if (createRequest.fulfilled.match(result)) {
      // Upload photos after creation (non-blocking, best-effort)
      if (photos.length > 0) {
        const requestId = (result.payload as any).id;
        for (const photoUri of photos) {
          requestsAPI.uploadImage(requestId, photoUri).catch(() => {});
        }
      }

      setIsSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '🎉 Request Posted!',
        'Your request is live. Volunteers near you have been notified.',
        [
          {
            text: 'View Request',
            onPress: () => navigation.navigate('RequestDetail', { requestId: (result.payload as any).id }),
          },
          { text: 'Back to Feed', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      setIsSubmitting(false);
      const errMsg = (result as any).payload ?? 'Unknown error';
      Alert.alert('Error', String(errMsg));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Help</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.stepRow}>
            <View style={[styles.stepDot, s <= step && styles.stepDotActive]}>
              <Text style={[styles.stepNumber, s <= step && styles.stepNumberActive]}>{s}</Text>
            </View>
            {s < 3 && <View style={[styles.stepLine, s < step && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>What do you need help with?</Text>

            {/* Title */}
            <View style={styles.field}>
              <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Help moving boxes to storage"
                placeholderTextColor={colors.gray300}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what you need and any important details..."
                placeholderTextColor={colors.gray300}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{description.length}/1000</Text>
            </View>

            {/* Photos */}
            <View style={styles.field}>
              <Text style={styles.label}>Photos (optional)</Text>
              <View style={styles.photosRow}>
                {photos.map((uri) => (
                  <View key={uri} style={styles.photoThumb}>
                    <RNImage source={{ uri }} style={styles.photoImg} />
                    <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(uri)}>
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 3 && (
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                    <Text style={styles.addPhotoIcon}>📷</Text>
                    <Text style={styles.addPhotoText}>Add photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Button
              label="Continue"
              onPress={() => { if (title.length >= 5 && description.length >= 10) setStep(2); }}
              disabled={title.length < 5 || description.length < 10}
              fullWidth
              size="lg"
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>Category & urgency</Text>

            {/* Category */}
            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.optionGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryOption, category === cat && styles.categoryOptionActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={styles.categoryOptionEmoji}>{categoryEmoji[cat]}</Text>
                    <Text style={[styles.categoryOptionLabel, category === cat && styles.categoryOptionLabelActive]}>
                      {cat.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Urgency */}
            <View style={styles.field}>
              <Text style={styles.label}>Urgency</Text>
              <View style={styles.urgencyRow}>
                {URGENCIES.map((u) => {
                  const cfg = urgencyConfig[u];
                  return (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.urgencyOption,
                        urgency === u && { backgroundColor: cfg.bg, borderColor: cfg.color },
                      ]}
                      onPress={() => setUrgency(u)}
                    >
                      <Text style={[styles.urgencyLabel, urgency === u && { color: cfg.color, fontWeight: '700' }]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Duration */}
            <View style={styles.field}>
              <Text style={styles.label}>Estimated Duration</Text>
              <View style={styles.durationRow}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.durationOption, duration === d && styles.durationOptionActive]}
                    onPress={() => setDuration(d)}
                  >
                    <Text style={[styles.durationLabel, duration === d && styles.durationLabelActive]}>
                      {d < 60 ? `${d}m` : `${d / 60}h`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.navRow}>
              <Button label="Back" onPress={() => setStep(1)} variant="outline" />
              <Button label="Continue" onPress={() => setStep(3)} />
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>Where do you need help?</Text>

            <View style={styles.field}>
              <View style={styles.locationToggle}>
                <Text style={styles.label}>Use my current location</Text>
                <Switch
                  value={useCurrentLocation}
                  onValueChange={setUseCurrentLocation}
                  trackColor={{ true: colors.primary }}
                />
              </View>
              {!useCurrentLocation && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter address..."
                  placeholderTextColor={colors.gray300}
                  value={address}
                  onChangeText={setAddress}
                />
              )}
              {address && (
                <View style={styles.addressConfirm}>
                  <Text style={styles.addressIcon}>📍</Text>
                  <Text style={styles.addressText}>{address}</Text>
                </View>
              )}
            </View>

            {/* XP preview */}
            <View style={styles.xpPreview}>
              <Text style={styles.xpPreviewTitle}>Estimated Reward</Text>
              <Text style={styles.xpPreviewValue}>
                ⚡ {Math.round(duration * 1.5 * { LOW: 1, MEDIUM: 1.5, HIGH: 2, EMERGENCY: 3 }[urgency])} XP
              </Text>
              <Text style={styles.xpPreviewNote}>for the volunteer who helps you</Text>
            </View>

            <View style={styles.navRow}>
              <Button label="Back" onPress={() => setStep(2)} variant="outline" />
              <Button
                label="Post Request"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={!isValid}
              />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: colors.textSecondary },
  headerTitle: { ...typography.heading4, flex: 1, textAlign: 'center', color: colors.text },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepNumber: { ...typography.label, color: colors.textMuted },
  stepNumberActive: { color: colors.white },
  stepLine: { width: 48, height: 2, backgroundColor: colors.border, marginHorizontal: spacing.xs },
  stepLineActive: { backgroundColor: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.section },
  stepTitle: { ...typography.heading3, color: colors.text, marginBottom: spacing.xl },
  field: { marginBottom: spacing.xl },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  required: { color: colors.error },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.bodyLg,
    color: colors.text,
  },
  textArea: { height: 120, paddingTop: spacing.md },
  charCount: { ...typography.caption, color: colors.textMuted, textAlign: 'right', marginTop: spacing.xs },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    minWidth: '45%',
    backgroundColor: colors.surface,
  },
  categoryOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '25' },
  categoryOptionEmoji: { fontSize: 16 },
  categoryOptionLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', flex: 1 },
  categoryOptionLabelActive: { color: colors.primary },
  urgencyRow: { flexDirection: 'row', gap: spacing.sm },
  urgencyOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  urgencyLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durationOption: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  durationOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '25' },
  durationLabel: { ...typography.label, color: colors.textMuted },
  durationLabelActive: { color: colors.primary },
  locationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addressConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addressIcon: { fontSize: 16 },
  addressText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  xpPreview: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  xpPreviewTitle: { ...typography.caption, color: colors.primaryLight },
  xpPreviewValue: { fontSize: 28, fontWeight: '800', color: colors.primary, marginVertical: spacing.xs },
  xpPreviewNote: { ...typography.caption, color: colors.textMuted },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  photosRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  photoThumb: { width: 80, height: 80, borderRadius: radius.md, overflow: 'visible' },
  photoImg: { width: 80, height: 80, borderRadius: radius.md },
  removePhoto: {
    position: 'absolute', top: -8, right: -8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.error,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  removePhotoText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addPhotoIcon: { fontSize: 22, marginBottom: 2 },
  addPhotoText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
});
