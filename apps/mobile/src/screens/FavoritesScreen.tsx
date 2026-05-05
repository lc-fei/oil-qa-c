import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { BottomTabs } from '../components/BottomTabs';
import { Screen } from '../components/Screen';
import { useFavoriteStore } from '../state/favoriteState';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const favorites = useFavoriteStore((state) => state.favorites);
  const loadFavorites = useFavoriteStore((state) => state.loadFavorites);
  const removeFavorite = useFavoriteStore((state) => state.removeFavorite);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  function handleRemoveFavorite(favoriteId: number) {
    Alert.alert('取消收藏', '确认取消收藏该内容？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        style: 'destructive',
        onPress: () => {
          void removeFavorite(favoriteId);
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>我的收藏</Text>
        <Pressable onPress={() => navigation.navigate('Profile')} style={styles.profile}>
          <Text style={styles.profileText}>我的</Text>
        </Pressable>
      </View>
      <FlatList
        data={favorites}
        keyExtractor={(item) => String(item.favoriteId)}
        style={styles.list}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('FavoriteDetail', { favoriteId: item.favoriteId })}>
            <AppCard>
              <Text numberOfLines={2} style={styles.itemTitle}>
                {item.title}
              </Text>
              <Text style={styles.meta}>{item.createdAt}</Text>
              <Pressable style={styles.remove} onPress={() => handleRemoveFavorite(item.favoriteId)}>
                <Text style={styles.removeText}>取消收藏</Text>
              </Pressable>
            </AppCard>
          </Pressable>
        )}
        ListEmptyComponent={
          <AppCard>
            <Text style={styles.meta}>暂无收藏内容。</Text>
          </AppCard>
        }
      />
      <BottomTabs active="favorites" onSessions={() => navigation.navigate('Sessions')} onFavorites={() => undefined} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
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
  list: {
    flex: 1,
  },
  content: {
    gap: 12,
    paddingBottom: 18,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  meta: {
    marginTop: 8,
    color: colors.muted,
  },
  remove: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  removeText: {
    color: colors.danger,
    fontWeight: '800',
  },
});
