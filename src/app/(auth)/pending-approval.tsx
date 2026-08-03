import { View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Layout, cardStyle } from '@/constants/layout';
import { Brand, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function PendingApprovalScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <ThemedText style={styles.heroBadge}>SD Services Partner</ThemedText>
        <ThemedText style={styles.heroTitle}>Application submitted</ThemedText>
      </View>

      <View style={styles.content}>
        <View style={[styles.card, cardStyle, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="time-outline" size={28} color={theme.primary} />
          </View>
          <ThemedText style={styles.title}>Waiting for admin approval</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.desc}>
            Your KYC and bank details are under review. You can sign in only after the admin approves
            your rider account.
          </ThemedText>
          {params.email ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.email}>
              Registered email: {params.email}
            </ThemedText>
          ) : null}

          <Pressable
            onPress={() => router.replace('/(auth)')}
            style={[styles.button, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.buttonText}>Go to login</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    backgroundColor: Brand.orange,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 56,
    paddingBottom: Spacing.four,
  },
  heroBadge: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontFamily: Fonts.extraBold,
    fontSize: 26,
    marginTop: Spacing.two,
  },
  content: {
    flex: 1,
    padding: Layout.screenPadding,
    justifyContent: 'center',
  },
  card: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.two,
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    textAlign: 'center',
  },
  desc: {
    marginTop: Spacing.two,
    textAlign: 'center',
    lineHeight: 20,
  },
  email: {
    marginTop: Spacing.two,
    fontFamily: Fonts.bold,
  },
  button: {
    marginTop: Spacing.three,
    borderRadius: Layout.buttonRadius,
    minHeight: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 16 },
});
