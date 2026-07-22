import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { cardStyle } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { VerificationStatus } from '@/types/rider';

const COPY: Record<
  VerificationStatus,
  { title: string; body: string; icon: keyof typeof Ionicons.glyphMap; tone: 'success' | 'warning' | 'danger' }
> = {
  approved: {
    title: 'Admin approved',
    body: 'Your account is verified. You can go online and accept deliveries.',
    icon: 'shield-checkmark',
    tone: 'success',
  },
  pending: {
    title: 'Pending admin approval',
    body: 'Your KYC is under review. You can update documents from Profile until approved.',
    icon: 'time-outline',
    tone: 'warning',
  },
  rejected: {
    title: 'Application rejected',
    body: 'Contact support or update your KYC and bank details, then wait for re-approval.',
    icon: 'close-circle-outline',
    tone: 'danger',
  },
};

export function VerificationBanner({ status }: { status: VerificationStatus }) {
  const theme = useTheme();
  const copy = COPY[status] ?? COPY.pending;
  const bg =
    copy.tone === 'success' ? theme.partnerSoft : copy.tone === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.12)';
  const border =
    copy.tone === 'success' ? theme.partner : copy.tone === 'danger' ? theme.danger : theme.warning;
  const fg = copy.tone === 'success' ? theme.partner : copy.tone === 'danger' ? theme.danger : theme.warning;

  return (
    <View style={[styles.banner, cardStyle, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name={copy.icon} size={22} color={fg} />
      </View>
      <View style={styles.text}>
        <ThemedText style={[styles.title, { color: fg }]}>{copy.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
          {copy.body}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 14,
    fontFamily: Fonts.extraBold,
    marginBottom: 4,
  },
  body: {
    lineHeight: 18,
  },
});
