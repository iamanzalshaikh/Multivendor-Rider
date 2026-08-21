import { View, StyleSheet, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Layout } from '@/constants/layout';
import { Spacing, Brand, Fonts } from '@/constants/theme';
import { formatJmd } from '@/lib/money';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  shift: any;
  activeOrdersCount: number;
  isHistorical?: boolean;
};

export function RiderEarningsDashboardCard({ shift, activeOrdersCount, isHistorical }: Props) {
  const router = useRouter();
  const theme = useTheme();

  if (!shift) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border }]}>
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={32} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Active Shift</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>Start a shift to see your live earnings dashboard.</Text>
        </View>
      </View>
    );
  }

  const duration = () => {
    const start = new Date(shift.startedAt).getTime();
    const end = shift.endedAt ? new Date(shift.endedAt).getTime() : Date.now();
    const diffMins = Math.floor((end - start) / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.primary, borderWidth: 0 }]}>
      
      <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.2)', borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="stats-chart" size={18} color="#fff" />
          <Text style={[styles.title, { color: '#fff' }]}>{isHistorical ? 'Shift Details' : 'Live Shift Dashboard'}</Text>
        </View>
        <View style={[styles.durationBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={[styles.durationText, { color: '#fff' }]}>{duration()}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.cellWrapper}>
          <View style={styles.cell}>
            <Text style={[styles.label, { color: 'rgba(255,255,255,0.7)' }]}>Trips Today</Text>
            <Text style={[styles.value, { color: '#fff' }]}>{shift.deliveriesCompleted}</Text>
          </View>
        </View>
        
        <View style={styles.cellWrapper}>
          <View style={styles.cell}>
            <Text style={[styles.label, { color: 'rgba(255,255,255,0.7)' }]}>Active Trips</Text>
            <Text style={[styles.value, { color: '#fff' }]}>{activeOrdersCount}</Text>
          </View>
        </View>
        
        <View style={styles.cellWrapper}>
          <View style={styles.cell}>
            <Text style={[styles.label, { color: 'rgba(255,255,255,0.7)' }]}>Delivery Fees</Text>
            <Text style={[styles.value, { color: '#fff' }]}>{formatJmd(shift.deliveryFeesCollected ?? 0)}</Text>
          </View>
        </View>
        
        <View style={styles.cellWrapper}>
          <View style={styles.cell}>
            <Text style={[styles.label, { color: 'rgba(255,255,255,0.7)' }]}>Tips</Text>
            <Text style={[styles.value, { color: '#fff' }]}>{formatJmd(shift.tipsReceived ?? 0)}</Text>
          </View>
        </View>
        
        <View style={styles.cellWrapper}>
          <View style={styles.cell}>
            <Text style={[styles.label, { color: 'rgba(255,255,255,0.7)' }]}>Purchases</Text>
            <Text style={[styles.value, { color: '#fff' }]}>{formatJmd(shift.cashSpentPurchases ?? 0)}</Text>
          </View>
        </View>
        
        <View style={styles.cellWrapper}>
          <View style={[styles.cell, { backgroundColor: 'rgba(0,0,0,0.12)', borderColor: 'transparent' }]}>
            <Text style={[styles.label, { color: 'rgba(255,255,255,0.7)' }]}>Float Bal</Text>
            <Text style={[styles.value, { color: '#fff' }]}>{formatJmd(shift.floatIssued ?? 0)}</Text>
          </View>
        </View>
        
        <View style={styles.cellWrapper}>
          <View style={[styles.cell, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1 }]}>
            <Text style={[styles.label, { color: '#fff' }]}>Owe Admin</Text>
            <Text style={[styles.value, { color: '#fff' }]}>{formatJmd(shift.expectedCashReturn ?? 0)}</Text>
          </View>
        </View>
      </View>

      {!isHistorical && (
        <View style={[styles.actionsFooter, { borderTopColor: 'rgba(255,255,255,0.2)', borderTopWidth: StyleSheet.hairlineWidth }]}>
          <Pressable onPress={() => router.push('/purchase')} style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Ionicons name="receipt-outline" size={16} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]} numberOfLines={1}>Log Purchase</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.cardRadius,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    overflow: 'hidden',
    shadowColor: '#f05a22',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyState: {
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: '#374151',
    marginTop: 12,
  },
  emptyDesc: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  cellWrapper: {
    width: '33.33%',
    padding: 4,
  },
  cell: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 64,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    textTransform: 'uppercase',
    fontFamily: Fonts.semiBold,
    marginBottom: 4,
  },
  value: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
});
