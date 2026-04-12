import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ResidentSummary, ResidentListResponse } from '../../shared-types/resident';

interface ApiResponse {
  success: boolean;
  data: ResidentListResponse;
}

export default function ResidentsListScreen() {
  const navigation = useNavigation<{
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  }>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['residents-mobile', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', status: 'active' });
      if (search) params.set('search', search);
      const res = await api.get<ApiResponse>(`/residents?${params}`);
      return res.data.data;
    },
  });

  const handleEndReached = useCallback(() => {
    if (data && page < data.pagination.pages) {
      setPage((p) => p + 1);
    }
  }, [data, page]);

  const renderItem = ({ item }: { item: ResidentSummary }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate('ResidentDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.itemAvatar}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoInitial}>{item.name.charAt(0)}</Text>
          </View>
        )}
        {item.hasExpiredDocuments && <View style={styles.expiredDot} />}
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSub}>
          {item.age} anos • {item.cpf}
        </Text>
      </View>

      <View
        style={[
          styles.statusBadge,
          item.status === 'active' ? styles.statusActive : styles.statusInactive,
        ]}
      >
        <Text style={styles.statusText}>
          {item.status === 'active' ? 'Ativo' : item.status === 'inactive' ? 'Inativo' : 'Alta'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.search}
          placeholder="Buscar por nome, CPF..."
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            setPage(1);
          }}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Stats */}
      {data && (
        <View style={styles.stats}>
          <Text style={styles.statsText}>{data.pagination.total} residentes</Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={data?.residents ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👴</Text>
            <Text style={styles.emptyText}>
              {isLoading ? 'Carregando...' : 'Nenhum residente encontrado'}
            </Text>
          </View>
        }
        contentContainerStyle={data?.residents.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewResident')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchContainer: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  search: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  stats: { paddingHorizontal: 16, paddingVertical: 8 },
  statsText: { fontSize: 12, color: '#6B7280' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  itemAvatar: { position: 'relative' },
  photo: { width: 44, height: 44, borderRadius: 22 },
  photoPlaceholder: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  photoInitial: { fontSize: 18, fontWeight: '600', color: '#6B7280' },
  expiredDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  itemContent: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  itemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusActive: { backgroundColor: '#D1FAE5' },
  statusInactive: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyContainer: { flex: 1 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
