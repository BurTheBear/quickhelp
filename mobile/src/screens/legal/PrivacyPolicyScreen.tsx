import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme';

const LAST_UPDATED = 'May 24, 2026';
const APP_NAME = 'QuickHelp';
const CONTACT_EMAIL = 'privacy@quickhelp.app';

const sections = [
  {
    title: '1. Information We Collect',
    body: `We collect the following types of information:\n\n• Account Information: Name, email address, and password when you create an account\n• Profile Information: Display name, bio, profile picture, city, and skills you optionally provide\n• Location Data: Your approximate location when you use location-based features (only when the app is active)\n• Device Information: Device type, operating system, and push notification token\n• Usage Data: How you interact with the app, tasks posted/completed, ratings given/received\n• Communications: Messages sent within the in-app chat feature`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to:\n\n• Provide and improve our services\n• Connect you with nearby volunteers or people who need help\n• Send push notifications about your tasks and matches\n• Calculate and display XP, levels, and leaderboard standings\n• Ensure safety through AI-powered content moderation\n• Respond to customer support requests\n• Comply with legal obligations`,
  },
  {
    title: '3. Location Data',
    body: `Location is used to show you nearby help requests and to allow volunteers to find you. We only access your location when the app is open and you have granted permission. You can disable location access at any time in your device settings. Note that disabling location will limit core functionality.`,
  },
  {
    title: '4. Data Sharing',
    body: `We do not sell your personal information. We may share data with:\n\n• Other users: Your display name, avatar, rating, and level are visible to other users\n• Service providers: Cloud infrastructure, database, and analytics providers who are bound by data processing agreements\n• Law enforcement: If required by law or to protect the safety of users\n\nWe never share your email, phone number, or precise location with other users.`,
  },
  {
    title: '5. Data Storage & Security',
    body: `Your data is stored on secure servers. We use industry-standard encryption for data in transit (TLS) and at rest. Passwords are hashed and never stored in plaintext. However, no method of transmission over the internet is 100% secure.`,
  },
  {
    title: '6. Data Retention',
    body: `We retain your account data as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required by law to retain it longer. Messages may be retained for a period for safety and moderation purposes.`,
  },
  {
    title: '7. Your Rights',
    body: `You have the right to:\n\n• Access the personal data we hold about you\n• Correct inaccurate data\n• Request deletion of your data\n• Object to processing of your data\n• Export your data in a portable format\n• Withdraw consent at any time\n\nTo exercise these rights, contact us at ${CONTACT_EMAIL}`,
  },
  {
    title: '8. Children\'s Privacy',
    body: `${APP_NAME} is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 18, we will take steps to delete that information.`,
  },
  {
    title: '9. Cookies & Tracking',
    body: `Our mobile app does not use browser cookies. We may use analytics tools to understand how users interact with the app. This data is anonymized and aggregated where possible.`,
  },
  {
    title: '10. Third-Party Services',
    body: `${APP_NAME} may integrate with third-party services including:\n\n• Firebase (Google) for authentication and push notifications\n• Expo services for app delivery and crash reporting\n• Mapping services for location features\n\nThese services have their own privacy policies which we encourage you to review.`,
  },
  {
    title: '11. Push Notifications',
    body: `We send push notifications to inform you about task updates, matches, and messages. You can disable push notifications at any time in your device settings or within the app's notification preferences.`,
  },
  {
    title: '12. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email. Your continued use of ${APP_NAME} after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '13. Contact Us',
    body: `If you have questions or concerns about our privacy practices, please contact our Privacy Team at:\n\n${CONTACT_EMAIL}\n\nWe aim to respond to all inquiries within 72 hours.`,
  },
];

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Privacy Policy</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.metaCard}>
          <Text style={s.appName}>🔒 {APP_NAME} Privacy</Text>
          <Text style={s.updated}>Last updated: {LAST_UPDATED}</Text>
          <Text style={s.intro}>
            Your privacy matters to us. This policy explains what data we collect, how we use it, and your rights regarding your personal information.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <Text style={s.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={s.footer}>
          <Text style={s.footerText}>
            For any privacy concerns, contact {CONTACT_EMAIL}
          </Text>
        </View>
      </ScrollView>
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
  content: { padding: spacing.lg, paddingBottom: 60 },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appName: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  updated: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  sectionBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  footer: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
