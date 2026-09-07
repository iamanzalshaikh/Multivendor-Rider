import { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/themed-text';
import { Layout, cardStyle } from '@/constants/layout';
import { LegalUrls } from '@/constants/legal';
import { Brand, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { loginWithEmailPassword } from '@/lib/auth';
import { ENV_INFO } from '@/config/env';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter email and password');
      return;
    }
    setBusy(true);
    try {
      await loginWithEmailPassword({ email: email.trim(), password });
      router.replace('/(tabs)');
    } catch (e) {
      const message = extractApiErrorMessage(e, 'Login failed');
      setError(message);
      if (message.toLowerCase().includes('pending admin approval')) {
        router.push({
          pathname: '/(auth)/pending-approval',
          params: { email: email.trim() },
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <ThemedText style={styles.heroBadge}>SD Services Partner</ThemedText>
        <ThemedText style={styles.heroTitle}>Deliver. Earn. Grow.</ThemedText>
        <ThemedText style={styles.heroSub}>Sign in to go online and accept deliveries.</ThemedText>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.card, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="label" themeColor="textSecondary">
              Email
            </ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="rider@example.com"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border, fontFamily: Fonts.medium }]}
            />

            <ThemedText type="label" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
              Password
            </ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border, fontFamily: Fonts.medium }]}
            />

            {error ? (
              <ThemedText type="small" style={{ color: theme.danger, marginTop: Spacing.one }}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={onLogin}
              disabled={busy}
              style={[styles.button, { backgroundColor: theme.primary, opacity: busy ? 0.7 : 1 }]}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Sign in</ThemedText>
              )}
            </Pressable>

            <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
              New rider?{' '}
              <Link href="/(auth)/register" style={{ color: theme.primary, fontFamily: Fonts.bold }}>
                Register
              </Link>
            </ThemedText>

            <View style={styles.legalBox}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.legalLine}>
                By continuing, you agree to our
              </ThemedText>
              <View style={styles.legalRow}>
                <Pressable onPress={() => void Linking.openURL(LegalUrls.terms)} hitSlop={8}>
                  <ThemedText type="small" style={[styles.legalLink, { color: theme.primary }]}>
                    Terms of Service
                  </ThemedText>
                </Pressable>
                <ThemedText type="small" themeColor="textSecondary">
                  {' '}
                  and{' '}
                </ThemedText>
                <Pressable onPress={() => void Linking.openURL(LegalUrls.privacy)} hitSlop={8}>
                  <ThemedText type="small" style={[styles.legalLink, { color: theme.primary }]}>
                    Privacy Policy
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {__DEV__ ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.devHint}>
                API: {ENV_INFO.apiUrl}
              </ThemedText>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
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
    fontSize: 28,
    marginTop: Spacing.two,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: Fonts.medium,
    fontSize: 14,
    marginTop: Spacing.two,
    lineHeight: 20,
  },
  scroll: { padding: Layout.screenPadding, paddingTop: Spacing.three },
  card: { padding: Spacing.three, gap: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: Layout.inputRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    marginTop: Spacing.three,
    borderRadius: Layout.buttonRadius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 16 },
  footer: { textAlign: 'center', marginTop: Spacing.three },
  legalBox: { marginTop: Spacing.three, alignItems: 'center', gap: 4 },
  legalLine: { textAlign: 'center' },
  legalRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  legalLink: { fontFamily: Fonts.bold, textDecorationLine: 'underline' },
  devHint: { textAlign: 'center', marginTop: Spacing.two, fontSize: 11 },
});
