import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hasLocalImage, hasUploadedImage, imageStatusLabel } from '@/lib/imageUtils';
import { isLocalImageUri, uploadRiderDocument } from '@/lib/apiUpload';
import { pickDocumentImage, takeDocumentPhoto } from '@/lib/pickDocumentImage';
import { invalidateRiderProfile } from '@/lib/riderQueryInvalidation';
import { fetchRiderMe, updateRiderProfile } from '@/services/riders';
import { useRiderStore } from '@/stores/riderStore';
import type { VehicleType } from '@/types/rider';

const VEHICLE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'bike', label: 'Bike' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'car', label: 'Car' },
];

function SectionTitle({ title }: { title: string }) {
  return (
    <ThemedText type="label" themeColor="textSecondary" style={styles.sectionTitle}>
      {title}
    </ThemedText>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'characters';
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
        ]}
      />
    </View>
  );
}

function DocUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (uri: string) => void;
}) {
  const theme = useTheme();
  const uploaded = hasUploadedImage(value);
  const selected = hasLocalImage(value);
  const status = imageStatusLabel(value);

  async function onPick(fromCamera: boolean) {
    const uri = fromCamera ? await takeDocumentPhoto(label) : await pickDocumentImage(label);
    if (uri) {
      if (__DEV__) console.log('[edit-profile] picked', { label, uri: uri.slice(0, 100) });
      onChange(uri);
    }
  }

  return (
    <View style={[styles.docCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.docHeader}>
        <ThemedText style={styles.docLabel}>{label}</ThemedText>
        {uploaded ? (
          <View style={[styles.uploadedBadge, { backgroundColor: theme.partnerSoft }]}>
            <Ionicons name="checkmark-circle" size={14} color={theme.partner} />
            <ThemedText style={{ color: theme.partner, fontSize: 11, fontFamily: Fonts.bold }}>
              Uploaded
            </ThemedText>
          </View>
        ) : selected ? (
          <View style={[styles.uploadedBadge, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="image-outline" size={14} color={theme.primary} />
            <ThemedText style={{ color: theme.primary, fontSize: 11, fontFamily: Fonts.bold }}>
              Selected
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {status}
          </ThemedText>
        )}
      </View>
      {(uploaded || selected) && value ? (
        <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
      ) : null}
      <View style={styles.docActions}>
        <Pressable
          onPress={() => onPick(false)}
          style={[styles.docBtn, { borderColor: theme.border }]}>
          <Ionicons name="images-outline" size={16} color={theme.primary} />
          <ThemedText type="link" style={{ fontSize: 13 }}>
            Gallery
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => onPick(true)}
          style={[styles.docBtn, { borderColor: theme.border }]}>
          <Ionicons name="camera-outline" size={16} color={theme.primary} />
          <ThemedText type="link" style={{ fontSize: 13 }}>
            Camera
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const setRider = useRiderStore((s) => s.setRider);

  const meQ = useQuery({ queryKey: ['rider', 'me'], queryFn: fetchRiderMe });

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [aadhaarCard, setAadhaarCard] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  useEffect(() => {
    if (!meQ.data) return;
    const { rider, user } = meQ.data;
    setFullName(user.fullName ?? '');
    setMobile(user.mobile ?? '');
    setEmail(user.email ?? '');
    setVehicleType(rider.vehicleType ?? 'bike');
    setVehicleNumber(rider.vehicleNumber ?? '');
    setProfileImage(rider.profileImage ?? user.profileImage ?? '');
    setDrivingLicense(rider.drivingLicense ?? '');
    setAadhaarCard(rider.aadhaarCard ?? '');
    setAccountHolderName(rider.bankAccountDetails?.accountHolderName ?? '');
    setAccountNumber(rider.bankAccountDetails?.accountNumber ?? '');
    setIfscCode(rider.bankAccountDetails?.ifscCode ?? '');
  }, [meQ.data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      async function resolveDoc(
        value: string,
        type: 'profileImage' | 'drivingLicense' | 'aadhaarCard',
      ) {
        if (!value) return undefined;
        if (isLocalImageUri(value)) {
          if (__DEV__) console.log('[edit-profile] uploading', type);
          return uploadRiderDocument(type, value);
        }
        if (hasUploadedImage(value)) return value;
        return undefined;
      }

      if (__DEV__) console.log('[edit-profile] saving profile');
      const [resolvedProfile, resolvedLicense, resolvedAadhaar] = await Promise.all([
        resolveDoc(profileImage, 'profileImage'),
        resolveDoc(drivingLicense, 'drivingLicense'),
        resolveDoc(aadhaarCard, 'aadhaarCard'),
      ]);

      return updateRiderProfile({
        fullName: fullName.trim() || undefined,
        mobile: mobile.trim() || undefined,
        vehicleType,
        vehicleNumber: vehicleNumber.trim() || undefined,
        profileImage: resolvedProfile,
        drivingLicense: resolvedLicense,
        aadhaarCard: resolvedAadhaar,
        bankAccountDetails:
          accountHolderName || accountNumber || ifscCode
            ? {
                accountHolderName: accountHolderName.trim() || undefined,
                accountNumber: accountNumber.trim() || undefined,
                ifscCode: ifscCode.trim().toUpperCase() || undefined,
              }
            : undefined,
      });
    },
    onSuccess: (data) => {
      setRider(data.rider);
      invalidateRiderProfile(qc);
      Alert.alert('Saved', 'Profile updated successfully.');
      router.back();
    },
    onError: (e) => {
      if (__DEV__) console.error('[edit-profile] save failed', e);
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Try again');
    },
  });

  function onSave() {
    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
      Alert.alert('Invalid mobile', 'Enter a 10-digit mobile number.');
      return;
    }
    if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode.trim())) {
      Alert.alert('Invalid IFSC', 'Enter a valid IFSC code (e.g. SBIN0001234).');
      return;
    }
    saveMut.mutate();
  }

  if (meQ.isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.nav, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.navTitle}>Edit profile</ThemedText>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled>
          <SectionTitle title="Personal" />
          <View style={[styles.block, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
            <Field
              label="Mobile"
              value={mobile}
              onChangeText={setMobile}
              placeholder="10-digit number"
              keyboardType="phone-pad"
            />
            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Email
              </ThemedText>
              <ThemedText style={styles.readOnly}>{email || '—'}</ThemedText>
            </View>
          </View>

          <SectionTitle title="Vehicle" />
          <View style={[styles.block, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="label" themeColor="textSecondary">
              Type
            </ThemedText>
            <View style={styles.chips}>
              {VEHICLE_OPTIONS.map((v) => (
                <Pressable
                  key={v.value}
                  onPress={() => setVehicleType(v.value)}
                  style={[
                    styles.chip,
                    {
                      borderColor: vehicleType === v.value ? theme.primary : theme.border,
                      backgroundColor: vehicleType === v.value ? theme.primarySoft : theme.background,
                    },
                  ]}>
                  <ThemedText
                    style={{
                      fontFamily: Fonts.bold,
                      fontSize: 12,
                      color: vehicleType === v.value ? theme.primary : theme.textSecondary,
                    }}>
                    {v.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <Field
              label="Vehicle number"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder="MH12AB1234"
              autoCapitalize="characters"
            />
          </View>

          <SectionTitle title="KYC documents" />
          <DocUpload label="Profile photo" value={profileImage} onChange={setProfileImage} />
          <DocUpload label="Driving license" value={drivingLicense} onChange={setDrivingLicense} />
          <DocUpload label="Aadhaar card" value={aadhaarCard} onChange={setAadhaarCard} />

          <SectionTitle title="Bank for payouts" />
          <View style={[styles.block, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <Field
              label="Account holder name"
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              placeholder="As per bank records"
            />
            <Field
              label="Account number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Account number"
              keyboardType="number-pad"
            />
            <Field
              label="IFSC code"
              value={ifscCode}
              onChangeText={setIfscCode}
              placeholder="SBIN0001234"
              autoCapitalize="characters"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
        <Pressable
          onPress={onSave}
          disabled={saveMut.isPending}
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saveMut.isPending ? 0.7 : 1 }]}>
          {saveMut.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.saveText}>Save changes</ThemedText>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  navTitle: { fontSize: 16, fontFamily: Fonts.extraBold },
  scroll: { padding: Layout.screenPadding, paddingBottom: 280 },
  sectionTitle: { marginBottom: Spacing.two, marginTop: Spacing.one },
  block: { padding: Spacing.three, marginBottom: Spacing.three },
  field: { marginBottom: Spacing.three },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: Layout.inputRadius,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  readOnly: { fontSize: 15, fontFamily: Fonts.semiBold, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two, marginBottom: Spacing.two },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  docCard: { padding: Spacing.three, marginBottom: Spacing.two },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docLabel: { fontSize: 14, fontFamily: Fonts.bold },
  uploadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  preview: { width: '100%', height: 120, borderRadius: Layout.inputRadius, marginTop: Spacing.two },
  docActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  docBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Layout.inputRadius,
    paddingVertical: 10,
  },
  footer: { padding: Layout.screenPadding, borderTopWidth: 1 },
  saveBtn: { borderRadius: Layout.buttonRadius, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 15 },
});
