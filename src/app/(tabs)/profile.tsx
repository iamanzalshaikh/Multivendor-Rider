import { View, StyleSheet, Pressable, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/screen-header';
import { TabScrollView } from '@/components/tab-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { VerificationBanner } from '@/components/verification-banner';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useRiderProfile } from '@/hooks/use-rider-profile';
import { useTheme } from '@/hooks/use-theme';
import { hasUploadedImage } from '@/lib/imageUtils';
import { logout } from '@/lib/auth';
import { disconnectSocket } from '@/lib/socketClient';
import { ENV_INFO } from '@/config/env';
import type { VerificationStatus } from '@/types/rider';

function InfoRow({
  label,
  value,
  icon,
  last,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.infoRow, !last && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
      <View style={[styles.infoIcon, { backgroundColor: theme.background }]}>
        <Ionicons name={icon} size={18} color={theme.textSecondary} />
      </View>
      <View style={styles.infoText}>
        <ThemedText type="label" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText style={styles.infoValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: ok ? theme.partnerSoft : theme.primarySoft, borderColor: ok ? theme.partner : theme.primary },
      ]}>
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle-outline'} size={14} color={ok ? theme.partner : theme.primary} />
      <ThemedText style={{ fontSize: 11, fontFamily: Fonts.bold, color: ok ? theme.partner : theme.primary }}>
        {label}
      </ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { rider: data, user, isLoading } = useRiderProfile();

  const kycComplete =
    hasUploadedImage(data?.profileImage) &&
    hasUploadedImage(data?.drivingLicense) &&
    hasUploadedImage(data?.aadhaarCard);
  const bankComplete = Boolean(
    data?.bankAccountDetails?.accountHolderName &&
      data?.bankAccountDetails?.accountNumber &&
      data?.bankAccountDetails?.ifscCode,
  );
  const verificationStatus = (data?.verificationStatus ?? 'pending') as VerificationStatus;

  async function onLogout() {
    Alert.alert('Log out', 'End your session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          disconnectSocket();
          await logout();
          router.replace('/(auth)');
        },
      },
    ]);
  }

  return (
    <TabScrollView style={[styles.root, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Profile"
        subtitle="Partner account"
        right={
          <Pressable onPress={() => router.push('/profile/edit' as never)} style={[styles.editBtn, { borderColor: theme.border }]}>
            <Ionicons name="create-outline" size={16} color={theme.primary} />
            <ThemedText type="link" style={{ fontSize: 12 }}>
              Edit
            </ThemedText>
          </Pressable>
        }
      />

      {isLoading && !data ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.four }} />
      ) : (
        <>
          <View style={styles.content}>
            <VerificationBanner status={verificationStatus} />
          </View>

          <View style={[styles.hero, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            {hasUploadedImage(data?.profileImage) ? (
              <Image source={{ uri: data!.profileImage! }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="person" size={32} color={theme.primary} />
              </View>
            )}
            <ThemedText style={styles.name}>{user?.fullName ?? data?.riderCode ?? 'Partner'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {data?.riderCode} · {user?.email ?? ''}
            </ThemedText>
            <View style={styles.chipRow}>
              <StatusChip
                ok={verificationStatus === 'approved'}
                label={
                  verificationStatus === 'approved'
                    ? 'Admin approved'
                    : verificationStatus === 'rejected'
                      ? 'Rejected'
                      : 'Awaiting approval'
                }
              />
              <StatusChip ok={kycComplete} label={kycComplete ? 'KYC complete' : 'KYC pending'} />
              <StatusChip ok={bankComplete} label={bankComplete ? 'Bank linked' : 'Add bank'} />
            </View>
          </View>

          <View style={[styles.infoCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <InfoRow label="Mobile" value={user?.mobile ?? '—'} icon="call-outline" />
            <InfoRow
              label="Vehicle"
              value={`${(data?.vehicleType ?? 'bike').toUpperCase()}${data?.vehicleNumber ? ` · ${data.vehicleNumber}` : ''}`}
              icon="bicycle-outline"
            />
            <InfoRow
              label="Admin verification"
              value={
                verificationStatus === 'approved'
                  ? 'Approved'
                  : verificationStatus === 'rejected'
                    ? 'Rejected'
                    : 'Pending review'
              }
              icon="shield-checkmark-outline"
            />
            <InfoRow label="Rating" value={`${data?.averageRating?.toFixed(1) ?? '0.0'} ★`} icon="star-outline" />
            <InfoRow label="Deliveries" value={String(data?.totalDeliveries ?? 0)} icon="cube-outline" />
            <InfoRow
              label="Lifetime earnings"
              value={`₹${data?.totalEarnings ?? 0}`}
              icon="wallet-outline"
              last
            />
          </View>

          <Pressable
            onPress={() => router.push('/notifications' as never)}
            style={[styles.actionCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="notifications-outline" size={22} color={theme.primary} />
            <View style={styles.actionText}>
              <ThemedText style={styles.actionTitle}>Notifications</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Delivery alerts and account updates
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/profile/edit' as never)}
            style={[styles.actionCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="document-text-outline" size={22} color={theme.primary} />
            <View style={styles.actionText}>
              <ThemedText style={styles.actionTitle}>KYC & bank details</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Upload documents and payout account
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </Pressable>
        </>
      )}

      <Pressable onPress={onLogout} style={[styles.logout, { borderColor: theme.danger }]}>
        <Ionicons name="log-out-outline" size={18} color={theme.danger} />
        <ThemedText style={{ color: theme.danger, fontFamily: Fonts.bold, fontSize: 15 }}>Log out</ThemedText>
      </Pressable>

      {__DEV__ ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.dev}>
          API: {ENV_INFO.apiUrl}
        </ThemedText>
      ) : null}
    </TabScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Layout.screenPadding,
    marginBottom: Spacing.two,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hero: {
    marginHorizontal: Layout.screenPadding,
    padding: Spacing.four,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36, marginBottom: Spacing.two },
  name: { fontSize: 20, fontFamily: Fonts.extraBold },
  chipRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three, flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  infoCard: { marginHorizontal: Layout.screenPadding, overflow: 'hidden', marginBottom: Spacing.two },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoValue: { fontSize: 15, fontFamily: Fonts.semiBold, marginTop: 2 },
  actionCard: {
    marginHorizontal: Layout.screenPadding,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 15, fontFamily: Fonts.bold },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginHorizontal: Layout.screenPadding,
    marginTop: Spacing.two,
    borderWidth: 1,
    borderRadius: Layout.buttonRadius,
    paddingVertical: 14,
  },
  dev: { textAlign: 'center', marginTop: Spacing.three, paddingHorizontal: Layout.screenPadding, fontSize: 11 },
});
