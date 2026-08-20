import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchMyRiderReviews } from '@/services/riders';

const STAR_YELLOW = '#FBBF24';

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name="star"
          size={14}
          color={n <= value ? STAR_YELLOW : '#E4E4E7'}
        />
      ))}
    </View>
  );
}

export default function RiderRatingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const q = useQuery({
    queryKey: ['rider', 'my-reviews'],
    queryFn: fetchMyRiderReviews,
  });

  const items = q.data?.items ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Customer ratings</ThemedText>
        <View style={{ width: 38 }} />
      </View>

      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? item._id ?? i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={[styles.empty, cardStyle, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="star-outline" size={32} color={STAR_YELLOW} />
              <ThemedText style={styles.emptyTitle}>No ratings yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                Completed deliveries with customer feedback will appear here.
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => {
            const score = Number(item.riderRating ?? item.rating ?? 0);
            const name = item.customerName ?? 'Customer';
            const comment = item.reviewText ?? item.comment ?? '';
            const when = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '';
            return (
              <View style={[styles.card, cardStyle, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                    <ThemedText style={{ color: theme.primary, fontFamily: Fonts.bold }}>
                      {name.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.name}>{name}</ThemedText>
                    {item.orderNumber ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Order #{item.orderNumber}
                      </ThemedText>
                    ) : null}
                    <View style={{ marginTop: 4 }}>
                      <Stars value={score} />
                    </View>
                  </View>
                  {when ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {when}
                    </ThemedText>
                  ) : null}
                </View>
                {comment ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.comment}>
                    {comment}
                  </ThemedText>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.two,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: Fonts.extraBold, fontSize: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Layout.screenPadding, gap: Spacing.two, paddingBottom: Spacing.five },
  card: { padding: Spacing.three, marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: Fonts.bold, fontSize: 14 },
  comment: { marginTop: Spacing.two, lineHeight: 18 },
  empty: {
    marginTop: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 16 },
});
