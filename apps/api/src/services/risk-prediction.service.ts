import { prisma } from '../lib/prisma.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RiskInput {
  age: number;
  diagnoses: string[];
  activeMedications: number;
  recentFalls: number;
  mobilityIssues: boolean;
  nutritionStatus?: string; // 'good' | 'fair' | 'poor'
  recentInfections: number;
}

export interface RiskResult {
  score: number;
  factors: string[];
}

// ─── Keyword helpers ──────────────────────────────────────────────────────────

const PSYCHOTROPIC_KEYWORDS = [
  'haloperidol', 'risperidona', 'olanzapina', 'quetiapina',
  'clonazepam', 'diazepam', 'alprazolam', 'midazolam',
  'zolpidem', 'fenobarbital', 'amitriptilina',
];

const PARKINSON_DEMENTIA_KEYWORDS = ['parkinson', 'demência', 'alzheimer', 'avc', 'acidente vascular'];
const DIABETIC_RENAL_KEYWORDS = ['diabetes', 'doença renal', 'insuficiência renal', 'imunossupressão'];
const DYSPHAGIA_KEYWORDS = ['avc', 'parkinson', 'demência', 'disfagia', 'alzheimer'];

function matchesKeywords(diagnoses: string[], keywords: string[]): number {
  const lower = diagnoses.map((d) => d.toLowerCase());
  return keywords.filter((kw) => lower.some((d) => d.includes(kw))).length;
}

// ─── Fall Risk ────────────────────────────────────────────────────────────────

export function calculateFallRisk(input: RiskInput): RiskResult {
  let score = 0;
  const factors: string[] = [];

  if (input.age > 80) {
    score += 20;
    factors.push(`Idade avançada (${input.age} anos)`);
  } else if (input.age > 75) {
    score += 10;
    factors.push(`Faixa etária de risco (${input.age} anos)`);
  }

  if (input.recentFalls > 0) {
    const bonus = Math.min(60, input.recentFalls * 30);
    score += bonus;
    factors.push(`${input.recentFalls} queda(s) recente(s) registrada(s)`);
  }

  if (input.mobilityIssues) {
    score += 20;
    factors.push('Dificuldade de mobilidade');
  }

  const psychotropicCount = PSYCHOTROPIC_KEYWORDS.filter((kw) =>
    input.diagnoses.some((d) => d.toLowerCase().includes(kw)),
  ).length;
  if (psychotropicCount > 0) {
    const bonus = Math.min(30, psychotropicCount * 15);
    score += bonus;
    factors.push(`Uso de ${psychotropicCount} medicamento(s) psicotrópico(s)`);
  }

  const neuroCount = matchesKeywords(input.diagnoses, PARKINSON_DEMENTIA_KEYWORDS);
  if (neuroCount > 0) {
    const bonus = Math.min(40, neuroCount * 20);
    score += bonus;
    factors.push('Condição neurológica associada a risco de queda');
  }

  return { score: Math.min(100, Math.round(score)), factors };
}

// ─── Infection Risk ───────────────────────────────────────────────────────────

export function calculateInfectionRisk(input: RiskInput): RiskResult {
  let score = 0;
  const factors: string[] = [];

  if (input.age > 80) {
    score += 15;
    factors.push(`Imunidade reduzida pela idade (${input.age} anos)`);
  }

  if (input.recentInfections > 0) {
    const bonus = Math.min(50, input.recentInfections * 25);
    score += bonus;
    factors.push(`${input.recentInfections} infecção(ões) recente(s)`);
  }

  const chronicCount = matchesKeywords(input.diagnoses, DIABETIC_RENAL_KEYWORDS);
  if (chronicCount > 0) {
    const bonus = Math.min(40, chronicCount * 20);
    score += bonus;
    factors.push('Condição crônica que reduz imunidade');
  }

  if (input.activeMedications > 10) {
    score += 15;
    factors.push(`Polifarmácia (${input.activeMedications} medicamentos ativos)`);
  }

  if (input.nutritionStatus === 'poor') {
    score += 20;
    factors.push('Estado nutricional ruim');
  } else if (input.nutritionStatus === 'fair') {
    score += 10;
    factors.push('Estado nutricional regular');
  }

  return { score: Math.min(100, Math.round(score)), factors };
}

// ─── Malnutrition Risk ────────────────────────────────────────────────────────

export function calculateMalnutritionRisk(input: RiskInput): RiskResult {
  let score = 0;
  const factors: string[] = [];

  if (input.age > 85) {
    score += 15;
    factors.push(`Idade muito avançada (${input.age} anos)`);
  }

  if (input.nutritionStatus === 'poor') {
    score += 40;
    factors.push('Estado nutricional ruim');
  } else if (input.nutritionStatus === 'fair') {
    score += 20;
    factors.push('Estado nutricional regular');
  }

  const dysphagiaCount = matchesKeywords(input.diagnoses, DYSPHAGIA_KEYWORDS);
  if (dysphagiaCount > 0) {
    score += Math.min(40, dysphagiaCount * 20);
    factors.push('Condição associada a dificuldade de deglutição');
  }

  if (input.activeMedications > 8) {
    score += 10;
    factors.push(`Polifarmácia pode reduzir apetite (${input.activeMedications} medicamentos)`);
  }

  if (input.recentFalls > 0 && input.mobilityIssues) {
    score += 10;
    factors.push('Imobilidade reduz ingesta alimentar');
  }

  return { score: Math.min(100, Math.round(score)), factors };
}

export function calculateOverallRisk(
  fallRisk: number,
  infectionRisk: number,
  malnutritionRisk: number,
): number {
  return Math.round(fallRisk * 0.4 + infectionRisk * 0.35 + malnutritionRisk * 0.25);
}

// ─── Recommendations ──────────────────────────────────────────────────────────

function buildRecommendations(
  fallRisk: number,
  infectionRisk: number,
  malnutritionRisk: number,
): string[] {
  const recs: string[] = [];

  if (fallRisk >= 60) recs.push('Protocolo de prevenção de quedas: grades de cama, tapetes antiderrapantes, supervisão em deslocamentos');
  else if (fallRisk >= 30) recs.push('Monitorar deslocamentos e revisar ambiente para risco de queda');

  if (infectionRisk >= 60) recs.push('Isolamento preventivo se necessário; higienização rigorosa das mãos; monitorar temperatura diariamente');
  else if (infectionRisk >= 30) recs.push('Reforçar higienização e observar sinais de infecção');

  if (malnutritionRisk >= 60) recs.push('Avaliação nutricional urgente; fracionar refeições; considerar suplementação');
  else if (malnutritionRisk >= 30) recs.push('Monitorar peso semanalmente e aceitação alimentar');

  return recs;
}

// ─── calculateAndSaveRiskScore ────────────────────────────────────────────────

export async function calculateAndSaveRiskScore(residentId: string, houseId: string) {
  const resident = await prisma.resident.findFirst({
    where: { id: residentId, houseId, deletedAt: null },
    include: {
      medications: { where: { status: 'active' }, select: { name: true } },
    },
  });

  if (!resident) throw new Error('Residente não encontrado');

  const history = (resident.medicalHistory as Record<string, unknown>) ?? {};
  const diagnosesRaw = (history['diagnoses'] as string[] | undefined) ?? [];
  const diagnosesFromHistory = Array.isArray(diagnosesRaw) ? diagnosesRaw : [];
  const medNames = resident.medications.map((m) => m.name);
  const allDiagnoses = [...diagnosesFromHistory, ...medNames];

  const now = new Date();
  const ageMs = now.getTime() - resident.birthDate.getTime();
  const age = Math.floor(ageMs / (365.25 * 86_400_000));

  const input: RiskInput = {
    age,
    diagnoses: allDiagnoses,
    activeMedications: resident.medications.length,
    recentFalls: Number(history['recentFalls'] ?? 0),
    mobilityIssues: Boolean(history['mobilityIssues'] ?? false),
    nutritionStatus: (history['nutritionStatus'] as string | undefined) ?? 'good',
    recentInfections: Number(history['recentInfections'] ?? 0),
  };

  const fall = calculateFallRisk(input);
  const infection = calculateInfectionRisk(input);
  const malnutrition = calculateMalnutritionRisk(input);
  const overall = calculateOverallRisk(fall.score, infection.score, malnutrition.score);

  const allFactors = [
    ...fall.factors.map((f) => `[Queda] ${f}`),
    ...infection.factors.map((f) => `[Infecção] ${f}`),
    ...malnutrition.factors.map((f) => `[Desnutrição] ${f}`),
  ];
  const recommendations = buildRecommendations(fall.score, infection.score, malnutrition.score);

  // Upsert: delete existing then create (Prisma doesn't support upsert without unique)
  await prisma.residentRiskScore.deleteMany({ where: { residentId } });

  return prisma.residentRiskScore.create({
    data: {
      residentId,
      houseId,
      fallRisk: fall.score,
      infectionRisk: infection.score,
      malnutritionRisk: malnutrition.score,
      overallRisk: overall,
      riskFactors: allFactors,
      recommendations,
    },
  });
}

export async function calculateHouseRiskScores(houseId: string) {
  const residents = await prisma.resident.findMany({
    where: { houseId, status: 'active', deletedAt: null },
    select: { id: true },
  });

  return Promise.all(
    residents.map((r) =>
      calculateAndSaveRiskScore(r.id, houseId).catch(() => null),
    ),
  );
}
