import type { QaMessage } from '@oil-qa-c/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { formatStage } from '../utils/stage';

interface MessageBubbleProps {
  message: QaMessage;
  onEvidence?: (messageId: number) => void;
  onToggleFavorite?: (message: QaMessage) => void;
}

export function MessageBubble({ message, onEvidence, onToggleFavorite }: MessageBubbleProps) {
  const isComplete = message.status === 'SUCCESS' || message.status === 'PARTIAL_SUCCESS';

  return (
    <View style={styles.wrap}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{message.question}</Text>
      </View>
      <View style={styles.answerBubble}>
        {message.workflow?.currentStage && !isComplete ? (
          <View style={styles.stage}>
            <Text style={styles.stageText}>{formatStage(message.workflow.stages.at(-1) ?? null)}</Text>
          </View>
        ) : null}
        <Text style={styles.answerText}>{message.partialAnswer || message.answer}</Text>
        {isComplete ? (
          <View style={styles.actions}>
            <Pressable onPress={() => onToggleFavorite?.(message)}>
              <Text style={styles.actionText}>{message.favorite ? '取消收藏' : '收藏'}</Text>
            </Pressable>
            <Pressable onPress={() => onEvidence?.(message.messageId)}>
              <Text style={styles.actionText}>查看依据</Text>
            </Pressable>
            <Text style={styles.actionText}>复制</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginBottom: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.accent,
  },
  userText: {
    color: '#ffffff',
    lineHeight: 21,
    fontSize: 15,
  },
  answerBubble: {
    maxWidth: '92%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  stage: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.greenSoft,
  },
  stageText: {
    color: colors.accentDark,
    fontWeight: '700',
    fontSize: 12,
  },
  answerText: {
    color: colors.text,
    lineHeight: 22,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionText: {
    color: colors.accentDark,
    fontWeight: '700',
    fontSize: 13,
  },
});
