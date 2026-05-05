import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { BottomTabs } from '../components/BottomTabs';
import { Screen } from '../components/Screen';
import { useSessionStore } from '../state/sessionState';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Sessions'>;

export function SessionsScreen({ navigation }: Props) {
  const sessions = useSessionStore((state) => state.sessions);
  const isLoading = useSessionStore((state) => state.isLoading);
  const loadSessions = useSessionStore((state) => state.loadSessions);
  const createSession = useSessionStore((state) => state.createSession);
  const renameSession = useSessionStore((state) => state.renameSession);
  const deleteSession = useSessionStore((state) => state.deleteSession);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function handleCreateSession() {
    const session = await createSession();
    navigation.navigate('Chat', { sessionId: session.sessionId, title: session.title });
  }

  function handleRenameSession(sessionId: number, currentTitle: string) {
    Alert.prompt('重命名会话', '请输入新的会话标题', async (title) => {
      const nextTitle = title.trim();
      if (nextTitle && nextTitle !== currentTitle) {
        await renameSession(sessionId, nextTitle);
      }
    }, 'plain-text', currentTitle);
  }

  function handleDeleteSession(sessionId: number) {
    Alert.alert('删除会话', '删除后会话将从列表移除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void deleteSession(sessionId);
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>历史会话</Text>
          <Text style={styles.subTitle}>从会话列表进入问答，右上角进入我的。</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Profile')} style={styles.profile}>
          <Text style={styles.profileText}>我的</Text>
        </Pressable>
      </View>
      <AppButton onPress={handleCreateSession}>新增会话</AppButton>
      {isLoading ? <ActivityIndicator color={colors.accent} style={styles.loading} /> : null}
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.sessionId)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('Chat', { sessionId: item.sessionId, title: item.title })}>
            <AppCard>
              <View style={styles.sessionRow}>
                <View style={styles.sessionMain}>
                  <Text numberOfLines={1} style={styles.sessionTitle}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={2} style={styles.sessionDesc}>
                    {item.lastQuestion || '暂无问题，进入后开始新一轮问答'}
                  </Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.metaText}>{item.messageCount} 条</Text>
                  <Text style={styles.metaText}>{item.updatedAt}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => handleRenameSession(item.sessionId, item.title)}>
                  <Text style={styles.actionText}>重命名</Text>
                </Pressable>
                <Pressable onPress={() => handleDeleteSession(item.sessionId)}>
                  <Text style={[styles.actionText, styles.deleteText]}>删除</Text>
                </Pressable>
              </View>
            </AppCard>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <AppCard>
              <Text style={styles.empty}>暂无历史会话，点击上方“新增会话”开始。</Text>
            </AppCard>
          ) : null
        }
      />
      <BottomTabs active="sessions" onSessions={() => undefined} onFavorites={() => navigation.navigate('Favorites')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  subTitle: {
    marginTop: 6,
    color: colors.muted,
  },
  profile: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  profileText: {
    color: colors.text,
    fontWeight: '800',
  },
  loading: {
    marginTop: 16,
  },
  list: {
    flex: 1,
    marginTop: 14,
  },
  listContent: {
    gap: 12,
    paddingBottom: 18,
  },
  sessionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  sessionMain: {
    flex: 1,
    gap: 8,
  },
  sessionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  sessionDesc: {
    color: colors.muted,
    lineHeight: 20,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionText: {
    color: colors.accentDark,
    fontWeight: '800',
  },
  deleteText: {
    color: colors.danger,
  },
  empty: {
    color: colors.muted,
    lineHeight: 22,
  },
});
