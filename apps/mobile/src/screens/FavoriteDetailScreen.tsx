import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { FavoriteItemDetail } from '@oil-qa-c/shared';
import { AppCard } from '../components/AppCard';
import { Screen } from '../components/Screen';
import { mobileSdk } from '../sdk';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FavoriteDetail'>;

export function FavoriteDetailScreen({ route }: Props) {
  const [detail, setDetail] = useState<FavoriteItemDetail | null>(route.params.detail ?? null);
  const [loading, setLoading] = useState(!route.params.detail);

  useEffect(() => {
    if (route.params.detail) {
      return;
    }

    setLoading(true);
    void mobileSdk.favoriteDetail(route.params.favoriteId).then(setDetail).finally(() => setLoading(false));
  }, [route.params.detail, route.params.favoriteId]);

  return (
    <Screen>
      <Text style={styles.title}>收藏详情</Text>
      {loading ? <ActivityIndicator color={colors.accent} style={styles.loading} /> : null}
      {detail ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <AppCard>
            <Text style={styles.sectionTitle}>问题</Text>
            <Text style={styles.text}>{detail.question}</Text>
          </AppCard>
          <AppCard>
            <Text style={styles.sectionTitle}>回答</Text>
            <Text style={styles.text}>{detail.answer}</Text>
          </AppCard>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  loading: {
    marginTop: 24,
  },
  scroll: {
    flex: 1,
    marginTop: 16,
  },
  content: {
    gap: 12,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '900',
    marginBottom: 10,
  },
  text: {
    color: colors.text,
    lineHeight: 23,
  },
});
