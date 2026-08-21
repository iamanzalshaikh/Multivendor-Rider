import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';

import { ScreenHeader } from '@/components/screen-header';
import { RiderEarningsDashboardCard } from '@/components/RiderEarningsDashboardCard';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePastShiftsQuery } from '@/hooks/queries/rider';
import { formatJmd } from '@/lib/money';

export default function ShiftDetailsScreen() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const router = useRouter();
  const pastShiftsQ = usePastShiftsQuery(true);

  if (pastShiftsQ.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Shift Details" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </View>
    );
  }

  const shift = pastShiftsQ.data?.find((s: any) => s.id === id);

  if (!shift) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Shift Details" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText themeColor="textSecondary">Shift not found</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Shift Details" showBack />
      
      <ScrollView contentContainerStyle={styles.content}>
        <RiderEarningsDashboardCard
          shift={shift}
          activeOrdersCount={0}
          isHistorical
        />

        <SectionCard title="Purchases" subtitle="Logged expenses during this shift">
          {!shift.purchases || shift.purchases.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No purchases logged on this shift.
            </ThemedText>
          ) : (
            shift.purchases.map((p: any) => (
              <View key={p.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontFamily: Fonts.semiBold, fontSize: 14, textTransform: 'capitalize' }}>
                    {String(p.category).replace(/_/g, ' ')}
                  </ThemedText>
                  {p.note ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {p.note}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText style={{ fontFamily: Fonts.semiBold, fontSize: 14 }}>{formatJmd(p.amount)}</ThemedText>
                  <ThemedText type="small" style={{ color: p.status === 'APPROVED' ? theme.partner : p.status === 'REJECTED' ? theme.danger : theme.warning }}>
                    {p.status}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
        </SectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: Layout.screenPadding,
    gap: Spacing.four,
    paddingBottom: Layout.safeAreaBottom + 40,
  },
});
