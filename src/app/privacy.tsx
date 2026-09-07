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
    title: 'Who we are',
    body: 'Scoots Delivery Services (CASE Delivery / SD Services) operates campus delivery for CASE Jamaica. This Rider app is for delivery partners fulfilling customer orders to campus drop-off points.',
  },
  {
    title: 'Information we collect',
    body: 'Account details, vehicle / KYC documents, bank payout details, delivery and earnings records, device data, and location while you use navigation on active trips (when you grant permission).',
  },
  {
    title: 'How we use it',
    body: 'To verify partners, assign and complete deliveries, calculate earnings / float, send notifications, prevent fraud, and comply with Jamaican law.',
  },
  {
    title: 'Sharing',
    body: 'Order details may be shared with customers, merchants, and ops as needed for delivery. We do not sell your personal information.',
  },
  {
    title: 'Your choices',
    body: 'Update profile/KYC in the app, manage device permissions, and delete your account via Profile → Delete Account or our web deletion page.',
  },
  {
    title: 'Contact',
    body: `Privacy requests: ${LEGAL_SUPPORT_EMAIL}`,
  },
];

export default function PrivacyScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <ThemedText style={styles.title}>Privacy Policy</ThemedText>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
            Last updated 7 Sep 2026 · CASE Jamaica. Summary below — open the full web policy for store listings.
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
            onPress={() => void Linking.openURL(LegalUrls.privacy)}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Ionicons name="open-outline" size={18} color="#fff" />
            <ThemedText style={styles.primaryBtnText}>Open full Privacy Policy</ThemedText>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(LegalUrls.supportMailto)} style={styles.secondaryBtn}>
            <ThemedText style={{ color: theme.primary, fontFamily: Fonts.bold }}>Email privacy team</ThemedText>
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
  secondaryBtn: { alignItems: 'center', paddingVertical: Spacing.two },
});
