import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme';

const LAST_UPDATED = 'May 24, 2026';
const APP_NAME = 'QuickHelp';
const CONTACT_EMAIL = 'legal@quickhelp.app';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By downloading, installing, or using ${APP_NAME}, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.`,
  },
  {
    title: '2. Description of Service',
    body: `${APP_NAME} is a community platform that connects people who need help with everyday tasks to nearby volunteers willing to assist. We do not guarantee the availability of volunteers or the completion of any task.`,
  },
  {
    title: '3. Eligibility',
    body: `You must be at least 18 years old to use ${APP_NAME}. By using the app, you confirm that you meet this age requirement. We may require identity verification for certain features.`,
  },
  {
    title: '4. User Accounts',
    body: `You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. ${APP_NAME} is not liable for any loss resulting from unauthorized account access.`,
  },
  {
    title: '5. Community Guidelines',
    body: `Users must treat each other with respect and dignity. The following are strictly prohibited:\n\n• Harassment, abuse, or threatening behavior\n• Posting false or misleading information\n• Attempting to circumvent our safety systems\n• Using the platform for commercial gain without permission\n• Sharing inappropriate or illegal content`,
  },
  {
    title: '6. Volunteer Responsibility',
    body: `Volunteers accept tasks at their own discretion. ${APP_NAME} does not employ volunteers and is not responsible for the quality, safety, or outcome of any task. Volunteers are independent individuals, not agents of ${APP_NAME}.`,
  },
  {
    title: '7. Safety',
    body: `Always use common sense when meeting strangers. Meet in public places when possible. Never share sensitive personal or financial information. Report suspicious behavior immediately using the in-app report function. ${APP_NAME} is not responsible for any injury, loss, or damage arising from in-person interactions.`,
  },
  {
    title: '8. XP, Points & Gamification',
    body: `XP, badges, and levels earned on ${APP_NAME} have no monetary value and cannot be redeemed for cash or prizes. We reserve the right to adjust, reset, or remove any gamification data at any time.`,
  },
  {
    title: '9. Prohibited Content',
    body: `You may not post requests or content that involves: illegal activities, discrimination based on protected characteristics, adult content, endangering minors, or any activity that violates local laws.`,
  },
  {
    title: '10. Intellectual Property',
    body: `All content within ${APP_NAME}, including the name, logo, design, and code, is the property of ${APP_NAME} or its licensors. You may not copy, modify, or distribute any part of the app without written permission.`,
  },
  {
    title: '11. Disclaimer of Warranties',
    body: `${APP_NAME} is provided "as is" without any warranties of any kind, express or implied. We do not guarantee that the service will be uninterrupted, error-free, or free of viruses or other harmful components.`,
  },
  {
    title: '12. Limitation of Liability',
    body: `To the maximum extent permitted by law, ${APP_NAME} shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, even if we have been advised of the possibility of such damages.`,
  },
  {
    title: '13. Termination',
    body: `We reserve the right to suspend or terminate your account at any time for violations of these terms, without prior notice. You may also delete your account at any time through the app settings.`,
  },
  {
    title: '14. Changes to Terms',
    body: `We may update these Terms of Service from time to time. We will notify you of significant changes through the app. Continued use of ${APP_NAME} after changes constitutes acceptance of the new terms.`,
  },
  {
    title: '15. Contact Us',
    body: `If you have any questions about these Terms of Service, please contact us at:\n\n${CONTACT_EMAIL}`,
  },
];

export default function TermsOfServiceScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Terms of Service</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.metaCard}>
          <Text style={s.appName}>⚡ {APP_NAME}</Text>
          <Text style={s.updated}>Last updated: {LAST_UPDATED}</Text>
          <Text style={s.intro}>
            Please read these terms carefully before using our service. They govern your use of the {APP_NAME} app and platform.
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
            By using {APP_NAME}, you acknowledge that you have read and understood these Terms of Service.
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
