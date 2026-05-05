import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { QaMessage } from '@oil-qa-c/shared';
import { AppButton } from '../components/AppButton';
import { MessageBubble } from '../components/MessageBubble';
import { Screen } from '../components/Screen';
import { mobileSdk } from '../sdk';
import { useSessionStore } from '../state/sessionState';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const messages = useSessionStore((state) => state.messages);
  const isStreaming = useSessionStore((state) => state.isStreaming);
  const openSession = useSessionStore((state) => state.openSession);
  const sendQuestion = useSessionStore((state) => state.sendQuestion);
  const updateMessageFavorite = useSessionStore((state) => state.updateMessageFavorite);
  const [question, setQuestion] = useState('');

  useEffect(() => {
    if (route.params?.sessionId) {
      void openSession(route.params.sessionId);
    }
  }, [openSession, route.params?.sessionId]);

  async function handleSend() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isStreaming) {
      return;
    }

    setQuestion('');
    try {
      await sendQuestion(trimmedQuestion, currentSessionId ?? route.params?.sessionId);
    } catch (error) {
      Alert.alert('发送失败', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  async function handleToggleFavorite(message: QaMessage) {
    try {
      if (message.favorite) {
        // 收藏详情接口以 favoriteId 删除；当前消息模型没有 favoriteId，先只同步 UI，后续真实详情接入后补齐映射。
        updateMessageFavorite(message.messageId, false);
        return;
      }

      await mobileSdk.favoriteMessage(message.messageId);
      updateMessageFavorite(message.messageId, true);
    } catch (error) {
      Alert.alert('收藏操作失败', error instanceof Error ? error.message : '请稍后重试');
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>返回</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
          {route.params?.title || '新对话'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.messageId)}
        style={styles.messages}
        contentContainerStyle={styles.messageContent}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            onEvidence={(messageId) => navigation.navigate('Evidence', { messageId })}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>输入油井工程问题，系统将基于知识图谱和上下文给出回答。</Text>}
      />
      <View style={styles.inputBar}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="输入你的问题"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
        />
        <AppButton loading={isStreaming} onPress={handleSend}>
          发送
        </AppButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    color: colors.accentDark,
    fontWeight: '800',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  headerSpacer: {
    width: 32,
  },
  messages: {
    flex: 1,
    marginTop: 16,
  },
  messageContent: {
    paddingBottom: 20,
  },
  empty: {
    marginTop: 80,
    textAlign: 'center',
    color: colors.muted,
    lineHeight: 22,
  },
  inputBar: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
