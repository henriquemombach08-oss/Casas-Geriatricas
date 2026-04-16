import { useLocalSearchParams } from 'expo-router';
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface Allergy {
  id: string;
  substance: string;
  severity: string;
  reaction?: string;
}

interface HealthCondition {
  id: string;
  name: string;
  status: string;
  diagnosisDate?: string;
}

interface Resident {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  cpf?: string;
  phone?: string;
  email?: string;
  address?: string;
  bloodType?: string;
  status: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  notes?: string;
  allergies?: Allergy[];
  healthConditions?: HealthCondition[];
}

interface ResidentResponse {
  data: Resident;
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    hospitalized: 'Hospitalizado',
    deceased: 'Falecido',
  };
  return map[status] ?? status;
}

function statusColor(status: string): 'green' | 'gray' | 'yellow' | 'red' {
  switch (status) {
    case 'active': return 'green';
    case 'inactive': return 'gray';
    case 'hospitalized': return 'yellow';
    case 'deceased': return 'red';
    default: return 'gray';
  }
}

function severityEmoji(severity: string): string {
  switch (severity) {
    case 'severe':
    case 'grave': return '🔴';
    case 'moderate':
    case 'moderada': return '🟡';
    case 'mild':
    case 'leve': return '🟢';
    default: return '⚪';
  }
}

function genderLabel(gender: string): string {
  switch (gender) {
    case 'M': return 'Masculino';
    case 'F': return 'Feminino';
    case 'O': return 'Outro';
    default: return gender;
  }
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function InfoRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {onPress ? (
        <TouchableOpacity onPress={onPress}>
          <Text style={[styles.infoValue, styles.infoLink]}>{value}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );
}

export default function ResidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['resident', id],
    queryFn: async () => {
      const { data } = await api.get<ResidentResponse>(`/residents/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  if (isLoading) return <Loading />;

  if (isError || !data) {
    return (
      <Screen>
        <EmptyState
          icon="⚠️"
          title="Erro ao carregar"
          subtitle="Não foi possível carregar os dados do residente."
        />
      </Screen>
    );
  }

  const age = calcAge(data.birthDate);
  const initials = getInitials(data.name);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
        }
      >
        {/* Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{data.name}</Text>
              <Text style={styles.ageLine}>{age} anos • {genderLabel(data.gender)}</Text>
              <View style={styles.badgeRow}>
                <Badge label={statusLabel(data.status)} color={statusColor(data.status)} />
                {data.bloodType ? (
                  <Badge label={data.bloodType} color="red" />
                ) : null}
              </View>
            </View>
          </View>
        </Card>

        {/* Personal */}
        <SectionHeader title="Informações pessoais" />
        <Card>
          <InfoRow label="Data de nascimento" value={formatDate(data.birthDate)} />
          <InfoRow label="CPF" value={data.cpf} />
          <InfoRow
            label="Telefone"
            value={data.phone}
            onPress={data.phone ? () => Linking.openURL(`tel:${data.phone}`) : undefined}
          />
          <InfoRow label="E-mail" value={data.email} />
          <InfoRow label="Endereço" value={data.address} />
        </Card>

        {/* Emergency */}
        {(data.emergencyContactName || data.emergencyContactPhone) ? (
          <>
            <SectionHeader title="Contato de emergência" />
            <Card>
              <InfoRow label="Nome" value={data.emergencyContactName} />
              <InfoRow label="Parentesco" value={data.emergencyContactRelationship} />
              <InfoRow
                label="Telefone"
                value={data.emergencyContactPhone}
                onPress={
                  data.emergencyContactPhone
                    ? () => Linking.openURL(`tel:${data.emergencyContactPhone}`)
                    : undefined
                }
              />
            </Card>
          </>
        ) : null}

        {/* Allergies */}
        {data.allergies && data.allergies.length > 0 ? (
          <>
            <SectionHeader title="Alergias" />
            <Card>
              {data.allergies.map((a) => (
                <View key={a.id} style={styles.listItem}>
                  <Text style={styles.listEmoji}>{severityEmoji(a.severity)}</Text>
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemTitle}>{a.substance}</Text>
                    {a.reaction ? (
                      <Text style={styles.listItemSub}>{a.reaction}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Health Conditions */}
        {data.healthConditions && data.healthConditions.length > 0 ? (
          <>
            <SectionHeader title="Condições de saúde" />
            <Card>
              {data.healthConditions.map((hc) => (
                <View key={hc.id} style={styles.listItem}>
                  <Text style={styles.listEmoji}>🏥</Text>
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemTitle}>{hc.name}</Text>
                    <Text style={styles.listItemSub}>{hc.status}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Notes */}
        {data.notes ? (
          <>
            <SectionHeader title="Observações" />
            <Card>
              <Text style={styles.notes}>{data.notes}</Text>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  headerCard: {
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  ageLine: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sectionHeader: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  infoLink: {
    color: colors.primary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  listItemSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notes: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
});
