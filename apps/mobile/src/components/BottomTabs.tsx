import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface BottomTabsProps {
  active: 'sessions' | 'favorites';
  onSessions: () => void;
  onFavorites: () => void;
}

export function BottomTabs({ active, onSessions, onFavorites }: BottomTabsProps) {
  return (
    <View style={styles.wrap}>
      <Pressable style={[styles.item, active === 'sessions' && styles.active]} onPress={onSessions}>
        <Text style={[styles.label, active === 'sessions' && styles.activeLabel]}>对话</Text>
      </Pressable>
      <Pressable style={[styles.item, active === 'favorites' && styles.active]} onPress={onFavorites}>
        <Text style={[styles.label, active === 'favorites' && styles.activeLabel]}>收藏</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    padding: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  item: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  active: {
    backgroundColor: colors.greenSoft,
  },
  label: {
    color: colors.muted,
    fontWeight: '700',
  },
  activeLabel: {
    color: colors.accentDark,
  },
});
