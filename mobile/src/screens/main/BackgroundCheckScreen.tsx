/**
 * BackgroundCheckScreen
 *
 * Guides the volunteer through a Sterling background check:
 *   Step 1 – Intro / consent
 *   Step 2 – Personal info form
 *   Step 3 – Pending / in-progress state
 *   Step 4 – Result (CLEAR ✅ or CONSIDER ⚠️)
 *
 * Deeplinked from:
 *   • RequestDetailScreen (when acceptRequest returns 403 + requiresBackgroundCheck)
 *   • ProfileScreen "Become a Volunteer" button
 *   • Push notification tapped after check completes
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme';
import { backgroundCheckAPI } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'intro' | 'form' | 'pending' | 'clear' | 'consider';

interface FormData {
  firstName:   string;
  lastName:    string;
  dateOfBirth: string;   // typed as MM/DD/YYYY, converted to YYYY-MM-DD on submit
  ssn:         string;   // full SSN (transmitted to Sterling, not stored)
  zipCode:     string;
  phone:       string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BackgroundCheckScreen() {
  const navigation = useNavigation<any>();
  const { colors }  = useTheme();
  const styles      = makeStyles(colors);

  const [step,    setStep]    = useState<Step>('intro');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<FormData>({
    firstName:   '',
    lastName:    '',
    dateOfBirth: '',
    ssn:         '',
    zipCode:     '',
    phone:       '',
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const updateField = useCallback((key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  /** Format SSN input as XXX-XX-XXXX */
  const handleSsnChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 9);
    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    } else if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    updateField('ssn', formatted);
  };

  /** Format DOB as MM/DD/YYYY */
  const handleDobChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    updateField('dateOfBirth', formatted);
  };

  // Convert MM/DD/YYYY → YYYY-MM-DD
  const toIsoDate = (mmddyyyy: string): string | null => {
    const parts = mmddyyyy.split('/');
    if (parts.length !== 3 || parts[2].length !== 4) return null;
    return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    // Validate
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Missing info', 'Please enter your first and last name.');
      return;
    }
    const isoDate = toIsoDate(form.dateOfBirth);
    if (!isoDate) {
      Alert.alert('Invalid date', 'Please enter your date of birth as MM/DD/YYYY.');
      return;
    }
    const age = (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 18) {
      Alert.alert('Age requirement', 'You must be at least 18 years old to volunteer.');
      return;
    }
    const ssnDigits = form.ssn.replace(/\D/g, '');
    if (ssnDigits.length > 0 && ssnDigits.length !== 9) {
      Alert.alert('Invalid SSN', 'Please enter a full 9-digit Social Security Number, or leave it blank.');
      return;
    }

    Alert.alert(
      'Submit Background Check',
      'Your information will be securely transmitted to Sterling Talent Solutions for verification. Are you ready to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setLoading(true);
            try {
              await backgroundCheckAPI.initiate({
                firstName:   form.firstName.trim(),
                lastName:    form.lastName.trim(),
                dateOfBirth: isoDate,
                ssn:         ssnDigits.length === 9 ? form.ssn : undefined,
                zipCode:     form.zipCode.trim() || undefined,
                phone:       form.phone.trim() || undefined,
              });
              setStep('pending');
            } catch (err: any) {
              const msg =
                err?.response?.data?.error ??
                err?.response?.data?.message ??
                'Failed to submit. Please try again.';
              Alert.alert('Error', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Render steps ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Background Check</Text>
          <View style={{ width: 40 }} />
        </View>

        {step === 'intro'   && <IntroStep    styles={styles} colors={colors} onContinue={() => setStep('form')} onBack={() => navigation.goBack()} />}
        {step === 'form'    && <FormStep     styles={styles} colors={colors} form={form} loading={loading} onUpdate={updateField} onDobChange={handleDobChange} onSsnChange={handleSsnChange} onSubmit={handleSubmit} />}
        {step === 'pending' && (
          <PendingStep
            styles={styles}
            colors={colors}
            onDone={() => navigation.goBack()}
            onSimulate={async (result: 'clear' | 'consider') => {
              try {
                await backgroundCheckAPI.devSimulate(result);
                setStep(result === 'clear' ? 'clear' : 'consider');
              } catch (e: any) {
                Alert.alert('Simulator error', e.response?.data?.error ?? 'Failed');
              }
            }}
          />
        )}
        {step === 'clear'   && <ClearStep    styles={styles} colors={colors} onDone={() => navigation.goBack()} />}
        {step === 'consider'&& <ConsiderStep styles={styles} colors={colors} onDone={() => navigation.goBack()} />}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Step: Intro ──────────────────────────────────────────────────────────────

function IntroStep({ styles, colors, onContinue, onBack }: any) {
  return (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconEmoji}>🔍</Text>
      </View>

      <Text style={styles.stepTitle}>Volunteer Background Check</Text>
      <Text style={styles.stepSubtitle}>
        QuickHelp uses <Text style={{ fontWeight: '700', color: colors.primary }}>Sterling Talent Solutions</Text>
        {' '}— a trusted, FCRA-compliant screening provider — to verify volunteers before they can help community members.
      </Text>

      <View style={styles.infoCard}>
        <InfoRow emoji="🛡️" title="Safe & Secure" body="Your information is encrypted and sent directly to Sterling. QuickHelp never stores your SSN." colors={colors} />
        <InfoRow emoji="⏱️" title="Typically 1–3 Business Days" body="Most checks complete within 24 hours. You'll get a push notification when results are ready." colors={colors} />
        <InfoRow emoji="📋" title="What's Checked" body="National criminal record search, sex offender registry, and global watchlist screening." colors={colors} />
        <InfoRow emoji="✅" title="One-Time Process" body="Once approved, your check is valid for 12 months. No repeat checks unless it expires." colors={colors} />
      </View>

      <TouchableOpacity
        style={styles.legalLink}
        onPress={() => Linking.openURL('https://www.sterlingcheck.com/privacy-policy/')}
      >
        <Text style={styles.legalLinkText}>View Sterling's Privacy Policy →</Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onBack}>
          <Text style={[styles.btnText, { color: colors.textMuted }]}>Not now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onContinue}>
          <Text style={[styles.btnText, { color: '#fff' }]}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Step: Form ───────────────────────────────────────────────────────────────

function FormStep({ styles, colors, form, loading, onUpdate, onDobChange, onSsnChange, onSubmit }: any) {
  return (
    <ScrollView
      contentContainerStyle={[styles.stepContent, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepTitle}>Your Information</Text>
      <Text style={styles.stepSubtitle}>
        Provide the details below exactly as they appear on your government-issued ID.
      </Text>

      {/* Name row */}
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Jane"
            placeholderTextColor={colors.textMuted}
            value={form.firstName}
            onChangeText={(v: string) => onUpdate('firstName', v)}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Doe"
            placeholderTextColor={colors.textMuted}
            value={form.lastName}
            onChangeText={(v: string) => onUpdate('lastName', v)}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* DOB */}
      <Text style={styles.label}>Date of Birth *</Text>
      <TextInput
        style={styles.input}
        placeholder="MM/DD/YYYY"
        placeholderTextColor={colors.textMuted}
        value={form.dateOfBirth}
        onChangeText={onDobChange}
        keyboardType="numeric"
        maxLength={10}
      />

      {/* SSN */}
      <Text style={styles.label}>Social Security Number</Text>
      <TextInput
        style={styles.input}
        placeholder="XXX-XX-XXXX (optional but recommended)"
        placeholderTextColor={colors.textMuted}
        value={form.ssn}
        onChangeText={onSsnChange}
        keyboardType="numeric"
        maxLength={11}
        secureTextEntry
      />
      <Text style={styles.fieldNote}>
        🔒 Your SSN is transmitted directly to Sterling and is never stored by QuickHelp.
      </Text>

      {/* Zip */}
      <Text style={styles.label}>ZIP Code</Text>
      <TextInput
        style={styles.input}
        placeholder="10001"
        placeholderTextColor={colors.textMuted}
        value={form.zipCode}
        onChangeText={(v: string) => onUpdate('zipCode', v)}
        keyboardType="numeric"
        maxLength={10}
      />

      {/* Phone */}
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="+1 (555) 000-0000"
        placeholderTextColor={colors.textMuted}
        value={form.phone}
        onChangeText={(v: string) => onUpdate('phone', v)}
        keyboardType="phone-pad"
        maxLength={20}
      />

      {/* Consent */}
      <View style={styles.consentBox}>
        <Text style={styles.consentText}>
          By submitting, I authorize QuickHelp and Sterling Talent Solutions to perform a background
          check and consent to the{' '}
          <Text
            style={{ color: colors.primary }}
            onPress={() => Linking.openURL('https://www.sterlingcheck.com/fcra-disclosure/')}
          >
            FCRA Disclosure & Summary of Rights
          </Text>
          .
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, styles.btnPrimary, { marginTop: spacing.lg }, loading && styles.btnDisabled]}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.btnText, { color: '#fff' }]}>Submit Background Check</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Step: Pending ────────────────────────────────────────────────────────────

function PendingStep({ styles, colors, onDone, onSimulate }: any) {
  const [simLoading, setSimLoading] = useState(false);

  const simulate = async (result: 'clear' | 'consider') => {
    setSimLoading(true);
    try {
      await onSimulate(result);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <View style={[styles.stepContent, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconEmoji}>⏳</Text>
      </View>
      <Text style={styles.stepTitle}>Check Submitted!</Text>
      <Text style={[styles.stepSubtitle, { textAlign: 'center' }]}>
        Your background check is being processed. This typically takes{' '}
        <Text style={{ fontWeight: '700', color: colors.primary }}>1–3 business days</Text>.
      </Text>
      <Text style={[styles.stepSubtitle, { textAlign: 'center', marginTop: spacing.sm }]}>
        You'll receive a push notification as soon as your results are ready.
      </Text>

      <View style={[styles.infoCard, { width: '100%', marginTop: spacing.xl }]}>
        <InfoRow emoji="📱" title="Push Notification" body="We'll alert you the moment results are ready." colors={colors} />
        <InfoRow emoji="📧" title="Email Confirmation" body="A confirmation will be sent to your registered email." colors={colors} />
        <InfoRow emoji="🔒" title="Data Security" body="All data is encrypted in transit and at rest." colors={colors} />
      </View>

      <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: spacing.xl }]} onPress={onDone}>
        <Text style={[styles.btnText, { color: '#fff' }]}>Back to App</Text>
      </TouchableOpacity>

      {/* ── DEV ONLY simulator ── only shows in Expo dev builds, never in production */}
      {__DEV__ && (
        <View style={styles.devPanel}>
          <Text style={styles.devLabel}>🛠 DEV SIMULATOR — not visible in production</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.devBtn, { backgroundColor: '#22c55e' }]}
              onPress={() => simulate('clear')}
              disabled={simLoading}
            >
              {simLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.devBtnText}>✅ Simulate CLEAR</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.devBtn, { backgroundColor: '#f59e0b' }]}
              onPress={() => simulate('consider')}
              disabled={simLoading}
            >
              <Text style={styles.devBtnText}>⚠️ Simulate CONSIDER</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Step: Clear (approved) ───────────────────────────────────────────────────

function ClearStep({ styles, colors, onDone }: any) {
  return (
    <View style={[styles.stepContent, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
        <Text style={styles.iconEmoji}>✅</Text>
      </View>
      <Text style={styles.stepTitle}>You're Approved!</Text>
      <Text style={[styles.stepSubtitle, { textAlign: 'center' }]}>
        Your background check passed. You can now accept volunteer requests and start helping your community!
      </Text>
      <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: spacing.xl }]} onPress={onDone}>
        <Text style={[styles.btnText, { color: '#fff' }]}>Start Volunteering 🎉</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step: Consider (needs review) ───────────────────────────────────────────

function ConsiderStep({ styles, colors, onDone }: any) {
  return (
    <View style={[styles.stepContent, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
      <View style={[styles.iconCircle, { backgroundColor: '#FFF3CD' }]}>
        <Text style={styles.iconEmoji}>⚠️</Text>
      </View>
      <Text style={styles.stepTitle}>Additional Review Needed</Text>
      <Text style={[styles.stepSubtitle, { textAlign: 'center' }]}>
        Your background check requires additional manual review. Our safety team will reach out within 3–5 business days.
      </Text>
      <Text style={[styles.stepSubtitle, { textAlign: 'center', marginTop: spacing.sm }]}>
        Under the{' '}
        <Text
          style={{ color: colors.primary }}
          onPress={() => Linking.openURL('https://www.consumer.ftc.gov/articles/pdf-0096-fair-credit-reporting-act.pdf')}
        >
          Fair Credit Reporting Act (FCRA)
        </Text>
        , you have the right to dispute any inaccurate information in your report.
      </Text>
      <TouchableOpacity style={[styles.btn, styles.btnSecondary, { marginTop: spacing.xl }]} onPress={onDone}>
        <Text style={[styles.btnText, { color: colors.textMuted }]}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Sub-component: InfoRow ───────────────────────────────────────────────────

function InfoRow({ emoji, title, body, colors }: { emoji: string; title: string; body: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-start' }}>
      <Text style={{ fontSize: 20, marginRight: spacing.sm, marginTop: 1 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>{body}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: any) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical:   spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor:   colors.surface,
    },
    headerTitle: {
      fontSize:   17,
      fontWeight: '700',
      color:      colors.text,
    },
    backBtn: {
      padding: spacing.xs,
      width:   40,
    },

    // Steps
    stepContent: {
      padding: spacing.lg,
    },
    iconCircle: {
      width:           88,
      height:          88,
      borderRadius:    44,
      backgroundColor: colors.primary + '18',
      alignItems:      'center',
      justifyContent:  'center',
      alignSelf:       'center',
      marginBottom:    spacing.lg,
    },
    iconEmoji: {
      fontSize: 40,
    },
    stepTitle: {
      fontSize:    24,
      fontWeight:  '800',
      color:       colors.text,
      textAlign:   'center',
      marginBottom: spacing.sm,
    },
    stepSubtitle: {
      fontSize:    15,
      color:       colors.textMuted,
      lineHeight:  22,
      textAlign:   'left',
      marginBottom: spacing.md,
    },

    // Info card
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius:    radius.lg,
      padding:         spacing.md,
      marginVertical:  spacing.md,
      borderWidth:     1,
      borderColor:     colors.border,
    },

    // Form
    row: {
      flexDirection: 'row',
      marginBottom:  spacing.sm,
    },
    label: {
      fontSize:    13,
      fontWeight:  '600',
      color:       colors.textMuted,
      marginBottom: 6,
      marginTop:   spacing.sm,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth:     1.5,
      borderColor:     colors.border,
      borderRadius:    radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical:   spacing.sm + 2,
      fontSize:        15,
      color:           colors.text,
    },
    fieldNote: {
      fontSize:    12,
      color:       colors.textMuted,
      marginTop:   spacing.xs,
      lineHeight:  16,
    },
    consentBox: {
      backgroundColor: colors.primary + '10',
      borderRadius:    radius.md,
      padding:         spacing.md,
      marginTop:       spacing.lg,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    consentText: {
      fontSize:  13,
      color:     colors.textMuted,
      lineHeight: 19,
    },

    // Buttons
    buttonRow: {
      flexDirection: 'row',
      gap:           spacing.sm,
      marginTop:     spacing.xl,
    },
    btn: {
      flex:            1,
      paddingVertical: spacing.md,
      borderRadius:    radius.lg,
      alignItems:      'center',
      justifyContent:  'center',
    },
    btnPrimary: {
      backgroundColor: colors.primary,
    },
    btnSecondary: {
      backgroundColor: colors.surface,
      borderWidth:     1.5,
      borderColor:     colors.border,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    btnText: {
      fontSize:   15,
      fontWeight: '700',
    },
    legalLink: {
      alignSelf:    'center',
      marginBottom: spacing.md,
    },
    legalLinkText: {
      fontSize: 13,
      color:    colors.primary,
    },

    // Dev simulator panel
    devPanel: {
      marginTop:       spacing.xl,
      width:           '100%',
      backgroundColor: '#1e1e1e',
      borderRadius:    radius.md,
      padding:         spacing.md,
      borderWidth:     1,
      borderColor:     '#333',
    },
    devLabel: {
      fontSize:   11,
      color:      '#888',
      fontWeight: '600',
      textAlign:  'center',
    },
    devBtn: {
      flex:            1,
      paddingVertical: spacing.sm,
      borderRadius:    radius.md,
      alignItems:      'center',
    },
    devBtnText: {
      fontSize:   13,
      fontWeight: '700',
      color:      '#fff',
    },
  });
}
