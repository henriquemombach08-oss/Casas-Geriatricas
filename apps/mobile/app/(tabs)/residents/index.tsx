import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface Resident {
  id: string;
  name: string;
  birthDate: string;
  status: string;
  hasExpiredDocuments?: boolean;
}

interface ResidentsResponse {
  data: Resident[];
  pagination?: { total: number; page: number; limit: number };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function statusBadgeColor(status: string): 'green' | 'yellow' | 'gray' | 'red' {
  switch (status) {
    case 'active': return 'green';
    case 'inactive': return 'gray';
    case 'hospitalized': return 'yellow';
    case 'deceased': return 'red';
    default: return 'gray';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Ativo';
    case 'inactive': return 'Inativo';
    case 'hospitalized': return 'Hospitalizado';
    case 'deceased': return 'Falecido';
    default: return status;
  }
}

const AVATAR_COLORS = [
  '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#7C3AED', '#EA580C',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

export default function ResidentsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearch as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(text);
    }, 400);
  }, []);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['residents', debouncedSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get<ResidentsResponse>('/residents', {
        params: {
          page: pageParam,
          limit: 20,
          search: debouncedSearch || undefined,
        },
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.pagination) return undefined;
      const { total, page, limit } = lastPage.pagination;
      if (page * limit < total) return page + 1;
      return undefined;
    },
  });

  const residents = data?.pages.flatMap((p) => p.data) ?? [];

  function renderItem({ item }: { item: Resident }) {
    const initials = getInitials(item.name);
    const age = calcAge(item.birthDate);
    const bgColor = avatarColor(item.name);

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push(`/(tabs)/residents/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: bgColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            {item.hasExpiredDocuments && (
              <View style={styles.redDot} />
            )}
          </View>
          <Text style={styles.age}>{age} anos</Text>
        </View>
        <Badge label={statusLabel(item.status)} color={statusBadgeColor(item.status)} />
      </TouchableOpacity>
    );
  }

  return (
    <Screen>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar residente..."
          placeholderTextColor={colors.gray400}
          value={search}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={residents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={residents.length === 0 ? styles.emptyContainer : styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState
              icon="👴"
              title="Nenhum residente encontrado"
              subtitle={debouncedSearch ? 'Tente outra busca.' : 'Adicione o primeiro residente.'}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? <Loading size="small" /> : null
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/residents/new')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  itemInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  age: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  separator: {
    height: spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  fabText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: fontWeight.regular,
    lineHeight: 32,
  },
});
