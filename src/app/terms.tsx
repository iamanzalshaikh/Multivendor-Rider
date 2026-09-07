import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { LEGAL_SUPPORT_EMAIL, LegalUrls } from '@/constants/legal';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SECTIONS = [
  {
    title: 'The service',
    body: 'SD Services Rider is the partner app for campus deliveries at CASE Jamaica. You fulfil merchant orders to selected drop-off points under ops rules.',
  },
  {
    title: 'Eligibility',
    body: 'You must provide accurate registration and KYC details. We may suspend accounts for fraud, abuse, or policy violations.',
  },
  {
    title: 'Deliveries & earnings',
    body: 'Accept and complete assigned deliveries. Earnings, float, and payouts follow in-app records and company policy. Estimated times may change with demand and conditions.',
  },
  {
    title: 'Acceptable use',
    body: 'Do not misuse the app (fake deliveries, harassment, scraping, or illegal activity).',
  },
  {
    title: 'Account deletion',
    body: 'You may delete your account in Profile → Delete Account or via our web deletion page. See the Privacy Policy for retention exceptions (e.g. payment / fraud records).',
  },
  {
    title: 'Contact',
    body: LEGAL_SUPPORT_EMAIL,
  },
];

export default function TermsScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <ThemedText style={styles.title}>Terms of Service</ThemedText>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
            Last updated 7 Sep 2026 · CASE Jamaica. Summary below — open the full web terms for store listings.
          </ThemedText>
          {SECTIONS.map((s) => (
            <View
              key={s.title}
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText style={styles.cardTitle}>{s.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {s.body}
              </ThemedText>
            </View>
          ))}
          <Pressable
            onPress={() => void Linking.openURL(LegalUrls.terms)}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Ionicons name="open-outline" size={18} color="#fff" />
            <ThemedText style={styles.primaryBtnText}>Open full Terms</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: Fonts.extraBold, flex: 1 },
  body: { padding: 16, paddingBottom: 40, gap: 12 },
  lead: { marginBottom: 4, lineHeight: 20 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  cardTitle: { fontSize: 14, fontFamily: Fonts.extraBold },
  primaryBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryBtnText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 14 },
});
