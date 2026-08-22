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
        { backgroundColor: theme.backgroundElement, borderColor: 'transparent' },
        pressed && { transform: [{ scale: 0.98 }] }
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.dateBlock, { backgroundColor: theme.primarySoft }]}>
          <ThemedText style={{ fontSize: 12, color: theme.primary, fontFamily: Fonts.extraBold, textTransform: 'uppercase', letterSpacing: 1 }}>{month}</ThemedText>
          <ThemedText style={{ fontSize: 26, fontFamily: Fonts.extraBold, lineHeight: 30, color: theme.primary }}>{day}</ThemedText>
          <ThemedText style={{ fontSize: 11, color: theme.primary, opacity: 0.7, fontFamily: Fonts.bold, marginTop: 2 }}>{year}</ThemedText>
        </View>
        <View style={styles.cardMain}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <ThemedText style={{ fontFamily: Fonts.extraBold, fontSize: 16 }}>{time} Shift</ThemedText>
              <View style={[styles.badge, { backgroundColor: theme.partnerSoft, marginTop: 6, alignSelf: 'flex-start' }]}>
                <ThemedText style={{ fontSize: 10, fontFamily: Fonts.bold, color: theme.partner }}>COMPLETED</ThemedText>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText style={{ fontFamily: Fonts.extraBold, fontSize: 18, color: theme.text }}>{formatJmd(totalEarned)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2, fontFamily: Fonts.medium }}>Total Earned</ThemedText>
            </View>
          </View>
          
          <View style={[styles.statsRow, { borderTopColor: `${theme.textSecondary}20` }]}>
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: `${theme.textSecondary}15` }]}>
                <Ionicons name="bicycle" size={14} color={theme.textSecondary} />
              </View>
              <ThemedText style={{ fontFamily: Fonts.bold, fontSize: 14, marginLeft: 8 }}>{shift.deliveriesCompleted}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginLeft: 4 }}>trips completed</ThemedText>
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
            <View style={[styles.summaryHeader, { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.summaryBox}>
                <View style={[styles.summaryIcon, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="briefcase" size={20} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Logged Shifts</Text>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>{totalShifts}</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBox}>
                <View style={[styles.summaryIcon, { backgroundColor: theme.partnerSoft }]}>
                  <Ionicons name="wallet" size={20} color={theme.partner} />
                </View>
                <View>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Lifetime Earned</Text>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>{formatJmd(lifetimeEarnings)}</Text>
                </View>
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
    borderRadius: 20,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginHorizontal: Spacing.three,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTop: {
    flexDirection: 'row',
  },
  dateBlock: {
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
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
  },
  statIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
