import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EvidenceDetail } from '@oil-qa-c/shared';
import { AppCard } from '../components/AppCard';
import { Screen } from '../components/Screen';
import { mobileSdk } from '../sdk';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Evidence'>;

export function EvidenceScreen({ route }: Props) {
  const [detail, setDetail] = useState<EvidenceDetail | null>(route.params.detail ?? null);
  const [loading, setLoading] = useState(!route.params.detail);

  useEffect(() => {
    if (route.params.detail) {
      return;
    }

    setLoading(true);
    void mobileSdk.evidence(route.params.messageId).then(setDetail).finally(() => setLoading(false));
  }, [route.params.detail, route.params.messageId]);

  return (
    <Screen>
      <Text style={styles.title}>知识依据</Text>
      {loading ? <ActivityIndicator color={colors.accent} style={styles.loading} /> : null}
      {detail ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <AppCard>
            <Text style={styles.sectionTitle}>可信度</Text>
            <Text style={styles.bigNumber}>{Math.round(detail.confidence * 100)}%</Text>
          </AppCard>
          <AppCard>
            <Text style={styles.sectionTitle}>实体</Text>
            {detail.entities.length ? (
              detail.entities.map((entity) => (
                <Text key={entity.entityId} style={styles.line}>
                  {entity.entityName} · {entity.entityType || '未分类'}
                </Text>
              ))
            ) : (
              <Text style={styles.muted}>未命中实体</Text>
            )}
          </AppCard>
          <AppCard>
            <Text style={styles.sectionTitle}>关系</Text>
            {detail.relations.length ? (
              detail.relations.map((relation) => (
                <Text key={`${relation.sourceName}-${relation.relationType}-${relation.targetName}`} style={styles.line}>
                  {relation.sourceName} - {relation.relationType} - {relation.targetName}
                </Text>
              ))
            ) : (
              <Text style={styles.muted}>未命中关系</Text>
            )}
          </AppCard>
          <AppCard>
            <Text style={styles.sectionTitle}>来源</Text>
            {detail.sources.map((source) => (
              <View key={`${source.sourceType}-${source.title}`} style={styles.source}>
                <Text style={styles.sourceTitle}>{source.title}</Text>
                <Text style={styles.muted}>{source.content}</Text>
              </View>
            ))}
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
  bigNumber: {
    color: colors.accentDark,
    fontSize: 32,
    fontWeight: '900',
  },
  line: {
    color: colors.text,
    lineHeight: 22,
  },
  muted: {
    color: colors.muted,
    lineHeight: 21,
  },
  source: {
    gap: 6,
    marginBottom: 12,
  },
  sourceTitle: {
    color: colors.text,
    fontWeight: '800',
  },
});
