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
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Layout, cardStyle } from '@/constants/layout';
import { Brand, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { dialog } from '@/lib/dialog';
import { forgotPassword, resetPassword } from '@/services/auth';

type Step = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    setError(null);
    if (!email.trim().includes('@')) {
      setError('Enter your registered Gmail / email address');
      return;
    }
    setBusy(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setStep('reset');
      dialog.alert('Check your email', 'We sent a 6-digit verification code to your Gmail / inbox.');
    } catch (e) {
      setError(extractApiErrorMessage(e, 'Failed to send verification code'));
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setError(null);
    if (otp.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    if (password.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }
    setBusy(true);
    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        newPassword: password,
      });
      dialog.alert('Success', 'Password updated. Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)') },
      ]);
    } catch (e) {
      setError(extractApiErrorMessage(e, 'Password reset failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <ThemedText style={styles.heroBadge}>SD Services Partner</ThemedText>
        <ThemedText style={styles.heroTitle}>
          {step === 'email' ? 'Forgot password' : 'Verify & reset'}
        </ThemedText>
        <ThemedText style={styles.heroSub}>
          {step === 'email'
            ? 'We’ll email a one-time code to verify your Gmail, then you can set a new password.'
            : `Enter the code sent to ${email.trim().toLowerCase()} and choose a new password.`}
        </ThemedText>
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
              Gmail / Email
            </ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={step === 'email'}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="rider@gmail.com"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  fontFamily: Fonts.medium,
                  opacity: step === 'email' ? 1 : 0.65,
                },
              ]}
            />

            {step === 'reset' ? (
              <>
                <ThemedText type="label" themeColor="textSecondary" style={styles.labelGap}>
                  Email verification code
                </ThemedText>
                <TextInput
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.border, fontFamily: Fonts.medium },
                  ]}
                />

                <ThemedText type="label" themeColor="textSecondary" style={styles.labelGap}>
                  New password
                </ThemedText>
                <View style={[styles.inputRow, { borderColor: theme.border }]}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.inputFlex, { color: theme.text, fontFamily: Fonts.medium }]}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>

                <ThemedText type="label" themeColor="textSecondary" style={styles.labelGap}>
                  Confirm password
                </ThemedText>
                <View style={[styles.inputRow, { borderColor: theme.border }]}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    placeholder="Re-enter new password"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.inputFlex, { color: theme.text, fontFamily: Fonts.medium }]}
                  />
                  <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>
              </>
            ) : null}

            {error ? (
              <ThemedText type="small" style={{ color: theme.danger, marginTop: Spacing.one }}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={step === 'email' ? sendOtp : onReset}
              disabled={busy}
              style={[styles.button, { backgroundColor: theme.primary, opacity: busy ? 0.7 : 1 }]}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>
                  {step === 'email' ? 'Send verification code' : 'Update password'}
                </ThemedText>
              )}
            </Pressable>

            {step === 'reset' ? (
              <Pressable onPress={sendOtp} disabled={busy} style={styles.resend}>
                <ThemedText type="small" style={{ color: theme.primary, fontFamily: Fonts.bold }}>
                  Resend code to email
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SafeAreaView edges={['bottom']} />
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
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
  heroSub: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: Fonts.medium,
    fontSize: 14,
    marginTop: Spacing.two,
    lineHeight: 20,
  },
  scroll: { padding: Layout.screenPadding, paddingTop: Spacing.three },
  card: { padding: Spacing.three, gap: Spacing.one },
  labelGap: { marginTop: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: Layout.inputRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginTop: 4,
  },
  inputRow: {
    borderWidth: 1,
    borderRadius: Layout.inputRadius,
    paddingHorizontal: 14,
    minHeight: 48,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  button: {
    marginTop: Spacing.three,
    borderRadius: Layout.buttonRadius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 16 },
  resend: { alignItems: 'center', marginTop: Spacing.two, paddingVertical: 8 },
});
