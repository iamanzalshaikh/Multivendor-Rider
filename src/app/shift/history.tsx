import { View, StyleSheet, FlatList, ActivityIndicator, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePastShiftsQuery } from '@/hooks/queries/rider';
import { formatJmd } from '@/lib/money';

const PastShiftCard = memo(function PastShiftCard({
  shift,
  theme,
  onPress,
}: {
  shift: any;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  const start = new Date(shift.startedAt);
  const month = start.toLocaleDateString(undefined, { month: 'short' });
  const day = start.toLocaleDateString(undefined, { day: 'numeric' });
  const year = start.toLocaleDateString(undefined, { year: 'numeric' });
  const time = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const totalEarned = (shift.deliveryFeesCollected ?? 0) + (shift.tipsReceived ?? 0);

  return (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [
        styles.card, 
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && { opacity: 0.8 }
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.dateBlock}>
          <ThemedText style={{ fontSize: 13, color: theme.primary, fontFamily: Fonts.bold, textTransform: 'uppercase' }}>{month}</ThemedText>
          <ThemedText style={{ fontSize: 24, fontFamily: Fonts.bold, lineHeight: 28 }}>{day}</ThemedText>
        </View>
        <View style={styles.cardMain}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <ThemedText style={{ fontFamily: Fonts.semiBold, fontSize: 16 }}>{year} Shift</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                Started at {time}
              </ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.partnerSoft }]}>
              <ThemedText style={{ fontSize: 11, fontFamily: Fonts.bold, color: theme.partner }}>CLOSED</ThemedText>
            </View>
          </View>
          
          <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
            <View style={styles.statItem}>
              <Ionicons name="bicycle" size={16} color={theme.textSecondary} />
              <ThemedText style={{ fontFamily: Fonts.semiBold, fontSize: 14, marginLeft: 6 }}>{shift.deliveriesCompleted}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginLeft: 4 }}>trips</ThemedText>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={16} color={theme.textSecondary} />
              <ThemedText style={{ fontFamily: Fonts.semiBold, fontSize: 14, marginLeft: 6, color: theme.success }}>{formatJmd(totalEarned)}</ThemedText>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

export default function AllShiftHistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const pastShiftsQ = usePastShiftsQuery(true);

  const { totalShifts, lifetimeEarnings } = useMemo(() => {
    if (!pastShiftsQ.data) return { totalShifts: 0, lifetimeEarnings: 0 };
    return pastShiftsQ.data.reduce(
      (acc: any, shift: any) => {
        acc.totalShifts += 1;
        acc.lifetimeEarnings += (shift.deliveryFeesCollected ?? 0) + (shift.tipsReceived ?? 0);
        return acc;
      },
      { totalShifts: 0, lifetimeEarnings: 0 }
    );
  }, [pastShiftsQ.data]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Shift History" showBack />
      
      {pastShiftsQ.isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : pastShiftsQ.data?.length ? (
        <FlatList
          data={pastShiftsQ.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={[styles.summaryHeader, { backgroundColor: theme.primary }]}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Total Logged Shifts</Text>
                <Text style={styles.summaryValue}>{totalShifts}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Lifetime Earnings</Text>
                <Text style={styles.summaryValue}>{formatJmd(lifetimeEarnings)}</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <PastShiftCard
              shift={item}
              theme={theme}
              onPress={() => router.push(`/shift/${item.id}` as never)}
            />
          )}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="time-outline" size={48} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 12 }}>
            No past shifts found.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    padding: Spacing.four,
    paddingBottom: Layout.safeAreaBottom + 40,
    gap: Spacing.three,
  },
  summaryHeader: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: Fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.three,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
  },
  dateBlock: {
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    borderRightWidth: 1,
    borderRightColor: 'rgba(150,150,150,0.1)',
  },
  cardMain: {
    flex: 1,
    padding: Spacing.three,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.four,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
