import { ScrollView, View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Resident } from '../../shared-types/resident';

interface ApiResponse {
  success: boolean;
  data: Resident;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  discharged: 'Transferido',
};

const BLOOD_LABELS: Record<string, string> = {
  O_pos: 'O+', O_neg: 'O-', A_pos: 'A+', A_neg: 'A-',
  B_pos: 'B+', B_neg: 'B-', AB_pos: 'AB+', AB_neg: 'AB-', unknown: '?',
};

export default function ResidentDetailScreen() {
  const route = useRoute<{ params: { id: string }; key: string; name: string }>();
  const { id } = route.params;

  const { data: resident, isLoading } = useQuery({
    queryKey: ['resident-mobile', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse>(`/residents/${id}`);
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!resident) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Residente não encontrado</Text>
      </View>
    );
  }

  const callPhone = (phone: string) => {
    void Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {resident.photoUrl ? (
          <Image source={{ uri: resident.photoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoInitial}>{resident.name.charAt(0)}</Text>
          </View>
        )}
        <Text style={styles.name}>{resident.name}</Text>
        <Text style={styles.sub}>
          CPF: {resident.cpf} • {resident.age} anos
        </Text>
        <View style={styles.badges}>
          <View style={[styles.badge, styles.badgeBlue]}>
            <Text style={styles.badgeText}>{STATUS_LABELS[resident.status] ?? resident.status}</Text>
          </View>
          {resident.bloodType && resident.bloodType !== 'unknown' && (
            <View style={[styles.badge, styles.badgeRed]}>
              <Text style={styles.badgeText}>{BLOOD_LABELS[resident.bloodType] ?? resident.bloodType}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Alerts */}
      {resident.hasExpiredDocuments && (
        <View style={styles.alert}>
          <Text style={styles.alertText}>⚠️ Documentos vencidos — renove o quanto antes</Text>
        </View>
      )}

      {/* Personal info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Pessoais</Text>
        {resident.phone && (
          <TouchableOpacity style={styles.row} onPress={() => callPhone(resident.phone!)}>
            <Text style={styles.rowLabel}>Telefone</Text>
            <Text style={[styles.rowValue, styles.link]}>{resident.phone}</Text>
          </TouchableOpacity>
        )}
        {resident.email && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{resident.email}</Text>
          </View>
        )}
        {resident.address && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Endereço</Text>
            <Text style={styles.rowValue}>
              {resident.address}{resident.addressNumber ? `, ${resident.addressNumber}` : ''}
              {resident.city ? `\n${resident.city}/${resident.state ?? ''}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Emergency contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contato de Emergência</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Nome</Text>
          <Text style={styles.rowValue}>{resident.emergencyContactName}</Text>
        </View>
        {resident.emergencyContactRelationship && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Relação</Text>
            <Text style={styles.rowValue}>{resident.emergencyContactRelationship}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.row}
          onPress={() => callPhone(resident.emergencyContactPhone)}
        >
          <Text style={styles.rowLabel}>Telefone</Text>
          <Text style={[styles.rowValue, styles.link]}>{resident.emergencyContactPhone}</Text>
        </TouchableOpacity>
      </View>

      {/* Allergies (critical) */}
      {(resident.medicalHistory?.allergies?.length ?? 0) > 0 && (
        <View style={[styles.section, styles.allergySection]}>
          <Text style={styles.sectionTitle}>⚠️ Alergias</Text>
          {resident.medicalHistory!.allergies!.map((a, i) => (
            <View key={a.id ?? i} style={styles.allergyItem}>
              <Text style={styles.allergyName}>{a.allergen}</Text>
              <Text style={styles.allergyDetail}>
                {a.severity === 'severe' ? '🔴 Grave' : a.severity === 'moderate' ? '🟡 Moderada' : '🟢 Leve'}
                {a.reaction ? ` — ${a.reaction}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Conditions */}
      {(resident.medicalHistory?.conditions?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condições de Saúde</Text>
          {resident.medicalHistory!.conditions!.map((c, i) => (
            <View key={c.id ?? i} style={styles.row}>
              <Text style={styles.rowLabel}>{c.name}</Text>
              <Text style={styles.rowValue}>
                {c.status === 'active' ? 'Ativo' : c.status === 'controlled' ? 'Controlado' : 'Resolvido'}
                {c.treatment ? `\n${c.treatment}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      {resident.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <Text style={styles.notes}>{resident.notes}</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6B7280' },
  header: { backgroundColor: '#fff', padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  photo: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  photoPlaceholder: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  photoInitial: { fontSize: 36, fontWeight: '700', color: '#6B7280' },
  name: { fontSize: 22, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeBlue: { backgroundColor: '#DBEAFE' },
  badgeRed: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  alert: {
    backgroundColor: '#FEF3C7',
    margin: 12,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertText: { color: '#92400E', fontSize: 13 },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  allergySection: { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  rowLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  rowValue: { fontSize: 13, color: '#1F2937', flex: 2, textAlign: 'right' },
  link: { color: '#2563EB' },
  allergyItem: { paddingVertical: 6 },
  allergyName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  allergyDetail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  notes: { fontSize: 13, color: '#374151', lineHeight: 20 },
});
