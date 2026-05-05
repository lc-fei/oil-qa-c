import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { Screen } from '../components/Screen';
import { useAuthStore } from '../state/authState';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
  }

  return (
    <Screen>
      <Text style={styles.title}>我的</Text>
      <AppCard>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{currentUser?.username?.slice(0, 1).toUpperCase() || 'U'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.name}>{currentUser?.nickname || currentUser?.username || '未命名用户'}</Text>
            <Text style={styles.account}>{currentUser?.account}</Text>
          </View>
        </View>
      </AppCard>
      <View style={styles.actions}>
        <AppButton variant="ghost" onPress={() => navigation.navigate('Favorites')}>
          我的收藏
        </AppButton>
        <AppButton variant="danger" onPress={handleLogout}>
          退出登录
        </AppButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 18,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenSoft,
  },
  avatarText: {
    color: colors.accentDark,
    fontSize: 22,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
    gap: 5,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  account: {
    color: colors.muted,
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
});
