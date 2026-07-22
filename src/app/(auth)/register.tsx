import { useCallback, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  type TextInput as TextInputType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { cardStyle, Layout } from '@/constants/layout';
import { Brand, Fonts, Spacing } from '@/constants/theme';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { useTheme } from '@/hooks/use-theme';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { registerWithEmailPassword } from '@/lib/auth';
import { pickDocumentImage, takeDocumentPhoto } from '@/lib/pickDocumentImage';
import type { VehicleType } from '@/types/rider';

const VEHICLE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'bike', label: 'Bike' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'car', label: 'Car' },
];

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const scrollRef = useRef<ScrollView>(null);
  const cardY = useRef(0);
  const fieldY = useRef<Record<string, number>>({});
  const inputRefs = useRef<Record<string, TextInputType | null>>({});

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('bike');
  const [profileImageUri, setProfileImageUri] = useState('');
  const [drivingLicenseUri, setDrivingLicenseUri] = useState('');
  const [aadhaarCardUri, setAadhaarCardUri] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keyboardOpen = keyboardInset > 0;
  const totalSteps = 3;

  const scrollToField = useCallback((key: string) => {
    const y = fieldY.current[key];
    if (y == null) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    });
  }, []);

  const registerFieldLayout = useCallback((key: string, y: number) => {
    fieldY.current[key] = cardY.current + y;
  }, []);

  async function pickDoc(
    label: string,
    setter: (uri: string) => void,
    mode: 'camera' | 'gallery' = 'gallery',
  ) {
    const uri =
      mode === 'camera' ? await takeDocumentPhoto(label) : await pickDocumentImage(label);
    if (uri) setter(uri);
  }

  function validateStep(currentStep: 1 | 2 | 3): boolean {
    if (currentStep === 1) {
      if (!fullName.trim() || !email.trim() || !mobile.trim() || password.length < 6) {
        setError('Step 1: Name, email, mobile and password (6+ chars) are required');
        return false;
      }
      if (!/^[0-9]{10}$/.test(mobile.trim())) {
        setError('Step 1: Mobile number must be 10 digits');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!drivingLicenseUri || !aadhaarCardUri) {
        setError('Step 2: Driving license and Aadhaar photos are required');
        return false;
      }
    }
    if (currentStep === 3) {
      if (!accountHolderName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
        setError('Step 3: Bank holder name, account number and IFSC are required');
        return false;
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode.trim())) {
        setError('Step 3: Please enter a valid IFSC code (example: SBIN0001234)');
        return false;
      }
    }
    setError(null);
    return true;
  }

  function handleNextStep() {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, totalSteps) as 1 | 2 | 3);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function onSubmit() {
    setError(null);
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    setBusy(true);
    try {
      if (__DEV__) console.log('[register] submitting rider application');
      await registerWithEmailPassword({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        mobile: mobile.trim(),
        vehicleType,
        vehicleNumber: vehicleNumber.trim() || undefined,
        profileImageUri: profileImageUri || undefined,
        drivingLicenseUri,
        aadhaarCardUri,
        bankAccountDetails: {
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
        },
      });

      router.replace({
        pathname: '/(auth)/pending-approval',
        params: { email: email.trim() },
      });
    } catch (e) {
      const message = extractApiErrorMessage(e, 'Registration failed');
      if (__DEV__) console.error('[register] failed', e);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    ['Full name', fullName, setFullName, false, 'words' as const, 'fullName'],
    ['Email', email, setEmail, false, 'none' as const, 'email'],
    ['Mobile (10 digits)', mobile, setMobile, false, 'phone-pad' as const, 'mobile'],
    ['Password', password, setPassword, true, 'default' as const, 'password'],
    ['Vehicle number', vehicleNumber, setVehicleNumber, false, 'default' as const, 'vehicleNumber'],
  ] as const;

  const scrollBottomPad =
    Math.max(insets.bottom, Spacing.two) + (keyboardOpen ? keyboardInset + Spacing.two : Spacing.three);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
        {!keyboardOpen ? (
          <View style={styles.hero}>
            <ThemedText style={styles.heroBadge}>QuickBite Partner</ThemedText>
            <ThemedText style={styles.heroTitle}>Join as rider</ThemedText>
            <ThemedText style={styles.heroSub}>
              Step {step} of {totalSteps} - Complete onboarding
            </ThemedText>
            <View style={styles.progressTrack}>
              {[1, 2, 3].map((n) => (
                <View
                  key={n}
                  style={[
                    styles.progressSegment,
                    { backgroundColor: n <= step ? '#ffffff' : 'rgba(255,255,255,0.3)' },
                  ]}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.heroCompact}>
            <ThemedText style={styles.heroCompactText}>
              Step {step} of {totalSteps}
            </ThemedText>
            <View style={styles.progressTrack}>
              {[1, 2, 3].map((n) => (
                <View
                  key={n}
                  style={[
                    styles.progressSegment,
                    { backgroundColor: n <= step ? Brand.orange : 'rgba(255,90,0,0.2)' },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        <View
          style={[styles.card, cardStyle, { backgroundColor: theme.backgroundElement }]}
          onLayout={(e) => {
            cardY.current = e.nativeEvent.layout.y;
          }}>
          {step === 1 ? (
            <>
              <ThemedText style={styles.stepTitle}>Step 1: Personal details</ThemedText>
              {fields.map(([label, value, setter, secure, keyboard, fieldKey]) => (
                <View
                  key={fieldKey}
                  style={styles.field}
                  onLayout={(e) => registerFieldLayout(fieldKey, e.nativeEvent.layout.y)}>
                  <ThemedText type="label" themeColor="textSecondary">
                    {label}
                  </ThemedText>
                  <TextInput
                    ref={(r) => {
                      inputRefs.current[fieldKey] = r;
                    }}
                    value={value}
                    onChangeText={setter}
                    secureTextEntry={secure}
                    autoCapitalize={label === 'Email' ? 'none' : 'words'}
                    keyboardType={keyboard === 'phone-pad' ? 'phone-pad' : 'default'}
                    placeholderTextColor={theme.textSecondary}
                    returnKeyType={fieldKey === 'vehicleNumber' ? 'done' : 'next'}
                    blurOnSubmit={fieldKey === 'vehicleNumber'}
                    onFocus={() => scrollToField(fieldKey)}
                    onSubmitEditing={() => {
                      const order = ['fullName', 'email', 'mobile', 'password', 'vehicleNumber'];
                      const idx = order.indexOf(fieldKey);
                      const next = order[idx + 1];
                      if (next) inputRefs.current[next]?.focus();
                    }}
                    style={[
                      styles.input,
                      { color: theme.text, borderColor: theme.border, fontFamily: Fonts.medium },
                    ]}
                  />
                </View>
              ))}
              <ThemedText type="label" themeColor="textSecondary" style={styles.sectionLabel}>
                Vehicle type
              </ThemedText>
              <View style={styles.vehicleRow}>
                {VEHICLE_OPTIONS.map((v) => (
                  <Pressable
                    key={v.value}
                    onPress={() => setVehicleType(v.value)}
                    style={[
                      styles.vehicleChip,
                      {
                        backgroundColor:
                          vehicleType === v.value ? theme.primarySoft : theme.backgroundSelected,
                        borderColor: vehicleType === v.value ? theme.primary : theme.border,
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{
                        color: vehicleType === v.value ? theme.primary : theme.textSecondary,
                        fontFamily: Fonts.bold,
                      }}>
                      {v.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <ThemedText style={styles.stepTitle}>Step 2: KYC documents</ThemedText>
              <View style={styles.docCard}>
                <ThemedText style={styles.docHeading}>Profile photo (optional)</ThemedText>
                <View style={styles.docActionsRow}>
                  <Pressable
                    style={[styles.docButton, { borderColor: theme.border }]}
                    onPress={() => pickDoc('profile photo', setProfileImageUri, 'gallery')}>
                    <Ionicons name="images-outline" size={16} color={theme.textSecondary} />
                    <ThemedText type="small">Gallery</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.docButton, { borderColor: theme.border }]}
                    onPress={() => pickDoc('profile photo', setProfileImageUri, 'camera')}>
                    <Ionicons name="camera-outline" size={16} color={theme.textSecondary} />
                    <ThemedText type="small">Camera</ThemedText>
                  </Pressable>
                </View>
              </View>
              <View style={styles.docCard}>
                <ThemedText style={styles.docHeading}>Driving License *</ThemedText>
                <View style={styles.docActionsRow}>
                  <Pressable
                    style={[styles.docButton, { borderColor: theme.border }]}
                    onPress={() => pickDoc('driving license', setDrivingLicenseUri, 'gallery')}>
                    <Ionicons name="images-outline" size={16} color={theme.textSecondary} />
                    <ThemedText type="small">Gallery</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.docButton, { borderColor: theme.border }]}
                    onPress={() => pickDoc('driving license', setDrivingLicenseUri, 'camera')}>
                    <Ionicons name="camera-outline" size={16} color={theme.textSecondary} />
                    <ThemedText type="small">Camera</ThemedText>
                  </Pressable>
                </View>
              </View>
              <View style={styles.docCard}>
                <ThemedText style={styles.docHeading}>Aadhaar card *</ThemedText>
                <View style={styles.docActionsRow}>
                  <Pressable
                    style={[styles.docButton, { borderColor: theme.border }]}
                    onPress={() => pickDoc('aadhaar card', setAadhaarCardUri, 'gallery')}>
                    <Ionicons name="images-outline" size={16} color={theme.textSecondary} />
                    <ThemedText type="small">Gallery</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.docButton, { borderColor: theme.border }]}
                    onPress={() => pickDoc('aadhaar card', setAadhaarCardUri, 'camera')}>
                    <Ionicons name="camera-outline" size={16} color={theme.textSecondary} />
                    <ThemedText type="small">Camera</ThemedText>
                  </Pressable>
                </View>
              </View>
              <View style={styles.previewRow}>
                {profileImageUri ? <Image source={{ uri: profileImageUri }} style={styles.preview} /> : null}
                {drivingLicenseUri ? (
                  <Image source={{ uri: drivingLicenseUri }} style={styles.preview} />
                ) : null}
                {aadhaarCardUri ? <Image source={{ uri: aadhaarCardUri }} style={styles.preview} /> : null}
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <ThemedText style={styles.stepTitle}>Step 3: Bank details</ThemedText>
              {(
                [
                  ['accountHolder', 'Account holder name', accountHolderName, setAccountHolderName, 'words', 'default'],
                  ['accountNumber', 'Account number', accountNumber, setAccountNumber, 'none', 'number-pad'],
                  ['ifsc', 'IFSC code', ifscCode, setIfscCode, 'characters', 'default'],
                ] as const
              ).map(([fieldKey, label, value, setter, capitalize, keyboard]) => (
                <View
                  key={fieldKey}
                  style={styles.field}
                  onLayout={(e) => registerFieldLayout(fieldKey, e.nativeEvent.layout.y)}>
                  <ThemedText type="label" themeColor="textSecondary">
                    {label}
                  </ThemedText>
                  <TextInput
                    ref={(r) => {
                      inputRefs.current[fieldKey] = r;
                    }}
                    value={value}
                    onChangeText={setter}
                    autoCapitalize={capitalize}
                    keyboardType={keyboard}
                    placeholder={fieldKey === 'ifsc' ? 'SBIN0001234' : undefined}
                    placeholderTextColor={theme.textSecondary}
                    onFocus={() => scrollToField(fieldKey)}
                    style={[
                      styles.input,
                      { color: theme.text, borderColor: theme.border, fontFamily: Fonts.medium },
                    ]}
                  />
                </View>
              ))}
            </>
          ) : null}

          {error ? (
            <View style={[styles.errorWrap, { borderColor: theme.danger }]}>
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.footerActions}>
            {step > 1 ? (
              <Pressable
                onPress={() => {
                  setStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3);
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
                style={[styles.secondaryButton, { borderColor: theme.border }]}>
                <ThemedText type="small" style={{ fontFamily: Fonts.bold }}>
                  Back
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.back()} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                <ThemedText type="small" style={{ fontFamily: Fonts.bold }}>
                  Back to login
                </ThemedText>
              </Pressable>
            )}

            {step < 3 ? (
              <Pressable
                onPress={handleNextStep}
                style={[styles.button, styles.flexOne, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.buttonText}>Next step</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={onSubmit}
                disabled={busy}
                style={[
                  styles.button,
                  styles.flexOne,
                  { backgroundColor: theme.primary, opacity: busy ? 0.7 : 1 },
                ]}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Submit for approval</ThemedText>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.screenPadding,
    flexGrow: 1,
  },
  hero: {
    backgroundColor: Brand.orange,
    marginHorizontal: -Layout.screenPadding,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroCompact: {
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
  },
  heroCompactText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Brand.orange,
    marginBottom: Spacing.one,
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
    marginTop: Spacing.one,
  },
  progressTrack: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    gap: 8,
  },
  progressSegment: {
    height: 6,
    flex: 1,
    borderRadius: 999,
  },
  card: { padding: Spacing.three, gap: Spacing.one, marginTop: Spacing.two },
  stepTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    marginBottom: Spacing.one,
  },
  sectionLabel: { marginTop: Spacing.one },
  field: { marginBottom: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: Layout.inputRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginTop: 4,
  },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  vehicleChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  docCard: {
    borderWidth: 1,
    borderColor: '#ececec',
    borderRadius: 12,
    padding: 12,
    marginTop: Spacing.two,
  },
  docHeading: {
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  docActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  docButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  preview: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  errorWrap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: Spacing.two,
  },
  button: {
    borderRadius: Layout.buttonRadius,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 16 },
  footerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  secondaryButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Layout.buttonRadius,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexOne: { flex: 1, minHeight: 48 },
});
