/**
 * Seed: Casa Quatro Estações — operando com 36/40 residentes.
 * Execute com: pnpm --filter api db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HOUSE_ID = '00000000-0000-0000-0000-000000000001';
const HOUSE2_ID = '00000000-0000-0000-0000-000000000002';

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function yearsAgo(n: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database — Casa Quatro Estações (36/40 residentes)...');

  // ── Houses ──────────────────────────────────────────────────────────────────

  await prisma.house.upsert({
    where: { id: HOUSE_ID },
    update: {},
    create: {
      id: HOUSE_ID,
      name: 'Casa Geriátrica Quatro Estações',
      address: 'Rua das Flores, 100',
      city: 'Porto Alegre',
      state: 'RS',
      phone: '51333334444',
      email: 'quatro@casageri.com.br',
      ownerName: 'Maria Oliveira',
    },
  });

  await prisma.house.upsert({
    where: { id: HOUSE2_ID },
    update: {},
    create: {
      id: HOUSE2_ID,
      name: 'Cantinho da Vovó',
      address: 'Av. Paulista, 500',
      city: 'São Paulo',
      state: 'SP',
      phone: '11333334444',
      email: 'cantinho@casageri.com.br',
      ownerName: 'Joana Pereira',
    },
  });

  // ── Users / Staff ────────────────────────────────────────────────────────────

  const pw = await bcrypt.hash('senha123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@quatro.com' },
    update: {},
    create: { houseId: HOUSE_ID, email: 'admin@quatro.com', passwordHash: pw, name: 'Maria Oliveira', role: 'admin', phone: '51999990001' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@cantinho.com' },
    update: {},
    create: { houseId: HOUSE2_ID, email: 'admin@cantinho.com', passwordHash: pw, name: 'Joana Pereira', role: 'admin', phone: '11999990001' },
  });

  await prisma.user.upsert({
    where: { email: 'diretora@quatro.com' },
    update: {},
    create: { houseId: HOUSE_ID, email: 'diretora@quatro.com', passwordHash: pw, name: 'Sandra Menezes', role: 'director', phone: '51999990002' },
  });

  const nurse1 = await prisma.user.upsert({
    where: { email: 'camila@quatro.com' },
    update: {},
    create: { houseId: HOUSE_ID, email: 'camila@quatro.com', passwordHash: pw, name: 'Camila Souza', role: 'nurse', phone: '51988881111' },
  });

  await prisma.user.upsert({
    where: { email: 'rodrigo@quatro.com' },
    update: {},
    create: { houseId: HOUSE_ID, email: 'rodrigo@quatro.com', passwordHash: pw, name: 'Rodrigo Moreira', role: 'nurse', phone: '51988881112' },
  });

  const cg1 = await prisma.user.upsert({
    where: { email: 'roberto@quatro.com' },
    update: {},
    create: { houseId: HOUSE_ID, email: 'roberto@quatro.com', passwordHash: pw, name: 'Roberto Lima', role: 'caregiver', phone: '51988882222' },
  });

  await prisma.user.upsert({
    where: { email: 'patricia@quatro.com' },
    update: {},
    create: { houseId: HOUSE_ID, email: 'patricia@quatro.com', passwordHash: pw, name: 'Patrícia Alves', role: 'caregiver', phone: '51988882223' },
  });

  await prisma.user.upsert({
    where: { email: 'leandro@quatro.com' },
    update: {},
    create: { houseId: HOUSE_ID, email: 'leandro@quatro.com', passwordHash: pw, name: 'Leandro Dias', role: 'caregiver', phone: '51988882224' },
  });

  await prisma.user.upsert({
    where: { email: 'financeiro@quatro.com' },
    update: {},
    create: { houseId: HOUSE_ID, email: 'financeiro@quatro.com', passwordHash: pw, name: 'Carla Nunes', role: 'admin_finance', phone: '51988883333' },
  });

  await prisma.user.upsert({
    where: { email: 'cozinha@quatro.com' },
    update: {},
    create: { houseId: HOUSE_ID, email: 'cozinha@quatro.com', passwordHash: pw, name: 'Dona Irene Teixeira', role: 'cook', phone: '51988884444' },
  });

  await prisma.user.upsert({
    where: { email: 'fisio@quatro.com' },
    update: {},
    create: { houseId: HOUSE_ID, email: 'fisio@quatro.com', passwordHash: pw, name: 'Marcos Figueiredo', role: 'other', customRole: 'Fisioterapeuta', phone: '51988885555' },
  });

  // ── Residents (36 total) ─────────────────────────────────────────────────────

  type ResidentInput = {
    cpf: string; name: string; birthDate: Date; gender: 'M' | 'F';
    maritalStatus: string; phone?: string;
    emergencyContactName: string; emergencyContactPhone: string; emergencyContactRelationship: string;
    bloodType?: string; admissionDate: Date;
    medicalHistory?: object; notes?: string;
    monthlyFee: number;
  };

  const residentsData: ResidentInput[] = [
    // ── already seeded ──
    {
      cpf: '11144477735', name: 'Maria da Silva', birthDate: new Date('1945-05-15'), gender: 'F',
      maritalStatus: 'widowed', phone: '51987654321',
      emergencyContactName: 'João Silva', emergencyContactPhone: '51999876543', emergencyContactRelationship: 'filho',
      bloodType: 'O_pos', admissionDate: new Date('2020-01-10'),
      medicalHistory: { allergies: [{ allergen: 'Penicilina', severity: 'severe', reaction: 'Anafilaxia' }], conditions: [{ name: 'Hipertensão', status: 'controlled', treatment: 'Losartana 50mg' }] },
      notes: 'Gosta de ler e ouvir música clássica.',
      monthlyFee: 4500,
    },
    {
      cpf: '22233344405', name: 'José Oliveira', birthDate: new Date('1938-11-20'), gender: 'M',
      maritalStatus: 'married', phone: '51912345678',
      emergencyContactName: 'Ana Oliveira', emergencyContactPhone: '51998765432', emergencyContactRelationship: 'esposa',
      bloodType: 'A_pos', admissionDate: new Date('2021-06-15'),
      medicalHistory: { conditions: [{ name: 'Diabetes Tipo 2', status: 'controlled' }, { name: 'Artrose', status: 'active' }] },
      monthlyFee: 3800,
    },
    {
      cpf: '33344455508', name: 'Francisco Pereira', birthDate: new Date('1942-03-08'), gender: 'M',
      maritalStatus: 'divorced', phone: '51976543210',
      emergencyContactName: 'Luciana Pereira', emergencyContactPhone: '51997654321', emergencyContactRelationship: 'filha',
      bloodType: 'B_pos', admissionDate: new Date('2022-09-01'),
      medicalHistory: { conditions: [{ name: 'Parkinson', status: 'active' }, { name: 'Depressão', status: 'controlled' }] },
      notes: 'Mobilidade reduzida. Auxílio para locomoção.',
      monthlyFee: 5200,
    },
    // ── new residents ──
    {
      cpf: '44455566601', name: 'Antônia Rodrigues', birthDate: new Date('1940-07-22'), gender: 'F',
      maritalStatus: 'widowed', phone: '51976001001',
      emergencyContactName: 'Carlos Rodrigues', emergencyContactPhone: '51996001001', emergencyContactRelationship: 'filho',
      bloodType: 'A_neg', admissionDate: monthsAgo(18),
      medicalHistory: { conditions: [{ name: 'Alzheimer (moderado)', status: 'active', treatment: 'Donepezila 10mg' }, { name: 'Hipertensão', status: 'controlled' }] },
      notes: 'Desorientação temporal. Necessita supervisão constante.',
      monthlyFee: 6800,
    },
    {
      cpf: '55566677702', name: 'Benedito Santos', birthDate: new Date('1935-02-14'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Vera Santos', emergencyContactPhone: '51996002002', emergencyContactRelationship: 'filha',
      bloodType: 'O_neg', admissionDate: monthsAgo(30),
      medicalHistory: { conditions: [{ name: 'Insuficiência Cardíaca', status: 'controlled' }, { name: 'Fibrilação Atrial', status: 'controlled' }, { name: 'Diabetes Tipo 2', status: 'controlled' }] },
      notes: 'Dieta hipossódica e hipoglicídica. Pesar diariamente.',
      monthlyFee: 5800,
    },
    {
      cpf: '66677788803', name: 'Carmen Ferreira', birthDate: new Date('1948-09-30'), gender: 'F',
      maritalStatus: 'married', phone: '51976003003',
      emergencyContactName: 'Pedro Ferreira', emergencyContactPhone: '51996003003', emergencyContactRelationship: 'esposo',
      bloodType: 'B_neg', admissionDate: monthsAgo(8),
      medicalHistory: { conditions: [{ name: 'AVC (sequela)', status: 'active' }, { name: 'Hemiplegia esquerda', status: 'active' }] },
      notes: 'Sequela de AVC. Fisioterapia 3x/semana. Dificuldade de deglutição.',
      monthlyFee: 6500,
    },
    {
      cpf: '77788899904', name: 'Geraldo Costa', birthDate: new Date('1937-12-05'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Adriana Costa', emergencyContactPhone: '51996004004', emergencyContactRelationship: 'neta',
      bloodType: 'AB_pos', admissionDate: monthsAgo(24),
      medicalHistory: { conditions: [{ name: 'Demência vascular', status: 'active' }, { name: 'Hipertensão', status: 'controlled' }] },
      notes: 'Confusão mental noturna (sundowning). Acamado parcialmente.',
      monthlyFee: 6200,
    },
    {
      cpf: '88899900005', name: 'Helena Carvalho', birthDate: new Date('1944-04-18'), gender: 'F',
      maritalStatus: 'divorced', phone: '51976005005',
      emergencyContactName: 'Renata Carvalho', emergencyContactPhone: '51996005005', emergencyContactRelationship: 'filha',
      bloodType: 'O_pos', admissionDate: monthsAgo(12),
      medicalHistory: { conditions: [{ name: 'Osteoporose', status: 'active' }, { name: 'Fratura de fêmur (pós-op)', status: 'active' }, { name: 'Hipotireoidismo', status: 'controlled' }] },
      notes: 'Pós-cirurgia de quadril. Fisioterapia diária.',
      monthlyFee: 5500,
    },
    {
      cpf: '99900011106', name: 'Iracema Lima', birthDate: new Date('1941-08-11'), gender: 'F',
      maritalStatus: 'widowed',
      emergencyContactName: 'Marcos Lima', emergencyContactPhone: '51996006006', emergencyContactRelationship: 'filho',
      bloodType: 'A_pos', admissionDate: monthsAgo(36),
      medicalHistory: { conditions: [{ name: 'DPOC', status: 'active', treatment: 'Salbutamol inalatório' }, { name: 'Hipertensão', status: 'controlled' }] },
      notes: 'Oxigênio suplementar noturno. Não fumar nas proximidades.',
      monthlyFee: 5900,
    },
    {
      cpf: '10011122207', name: 'Jorge Almeida', birthDate: new Date('1933-06-27'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Sílvia Almeida', emergencyContactPhone: '51996007007', emergencyContactRelationship: 'filha',
      bloodType: 'B_pos', admissionDate: monthsAgo(48),
      medicalHistory: { conditions: [{ name: 'Alzheimer (avançado)', status: 'active' }] },
      notes: 'Acamado. Dieta pastosa. Mudança de decúbito 2/2h. Fraldas.',
      monthlyFee: 7200,
    },
    {
      cpf: '11122233308', name: 'Luzia Barbosa', birthDate: new Date('1946-01-03'), gender: 'F',
      maritalStatus: 'married', phone: '51976008008',
      emergencyContactName: 'Fábio Barbosa', emergencyContactPhone: '51996008008', emergencyContactRelationship: 'esposo',
      bloodType: 'O_pos', admissionDate: monthsAgo(6),
      medicalHistory: { conditions: [{ name: 'Depressão maior', status: 'active' }, { name: 'Ansiedade generalizada', status: 'controlled' }, { name: 'Hipertensão', status: 'controlled' }] },
      notes: 'Acompanhamento psiquiátrico mensal.',
      monthlyFee: 4200,
    },
    {
      cpf: '22233344409', name: 'Manoel Nascimento', birthDate: new Date('1939-10-14'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Terezinha Nascimento', emergencyContactPhone: '51996009009', emergencyContactRelationship: 'filha',
      bloodType: 'A_neg', admissionDate: monthsAgo(20),
      medicalHistory: { conditions: [{ name: 'Insuficiência Renal Crônica (estágio 3)', status: 'active' }, { name: 'Diabetes Tipo 2', status: 'controlled' }, { name: 'Anemia', status: 'controlled' }] },
      notes: 'Controle hídrico rigoroso. Dieta com restrição de potássio.',
      monthlyFee: 6100,
    },
    {
      cpf: '33344455510', name: 'Neide Martins', birthDate: new Date('1943-05-28'), gender: 'F',
      maritalStatus: 'widowed', phone: '51976010010',
      emergencyContactName: 'Wilson Martins', emergencyContactPhone: '51996010010', emergencyContactRelationship: 'filho',
      bloodType: 'O_pos', admissionDate: monthsAgo(15),
      medicalHistory: { conditions: [{ name: 'Hipertensão', status: 'controlled' }, { name: 'Artrite reumatoide', status: 'active' }] },
      notes: 'Dores articulares frequentes. Boa comunicação.',
      monthlyFee: 4000,
    },
    {
      cpf: '44455566611', name: 'Odete Ribeiro', birthDate: new Date('1936-03-09'), gender: 'F',
      maritalStatus: 'widowed',
      emergencyContactName: 'Cláudia Ribeiro', emergencyContactPhone: '51996011011', emergencyContactRelationship: 'neta',
      bloodType: 'B_pos', admissionDate: monthsAgo(42),
      medicalHistory: { conditions: [{ name: 'Alzheimer (leve)', status: 'active' }, { name: 'Osteoporose', status: 'controlled' }] },
      notes: 'Lúcida na maioria do tempo. Atividades em grupo.',
      monthlyFee: 5600,
    },
    {
      cpf: '55566677712', name: 'Pedro Gomes', birthDate: new Date('1940-11-17'), gender: 'M',
      maritalStatus: 'married', phone: '51976012012',
      emergencyContactName: 'Rosa Gomes', emergencyContactPhone: '51996012012', emergencyContactRelationship: 'esposa',
      bloodType: 'A_pos', admissionDate: monthsAgo(10),
      medicalHistory: { conditions: [{ name: 'Diabetes Tipo 2', status: 'controlled' }, { name: 'Hipertensão', status: 'controlled' }, { name: 'Retinopatia diabética', status: 'active' }] },
      notes: 'Visão reduzida. Glicemia 4x/dia.',
      monthlyFee: 4800,
    },
    {
      cpf: '66677788813', name: 'Rosa Souza', birthDate: new Date('1949-07-04'), gender: 'F',
      maritalStatus: 'widowed', phone: '51976013013',
      emergencyContactName: 'Eduardo Souza', emergencyContactPhone: '51996013013', emergencyContactRelationship: 'filho',
      bloodType: 'O_neg', admissionDate: monthsAgo(4),
      medicalHistory: { conditions: [{ name: 'Parkinson (leve)', status: 'active' }, { name: 'Constipação crônica', status: 'active' }] },
      notes: 'Tremor em repouso. Boa mobilidade. Atividades em grupo.',
      monthlyFee: 4600,
    },
    {
      cpf: '77788899914', name: 'Sebastião Correia', birthDate: new Date('1934-09-22'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Marta Correia', emergencyContactPhone: '51996014014', emergencyContactRelationship: 'filha',
      bloodType: 'AB_neg', admissionDate: monthsAgo(55),
      medicalHistory: { conditions: [{ name: 'Insuficiência Cardíaca', status: 'controlled' }, { name: 'Marcapasso implantado', status: 'active' }] },
      notes: 'Portador de marcapasso. Evitar campos magnéticos fortes.',
      monthlyFee: 5800,
    },
    {
      cpf: '88899900015', name: 'Teresa Gonçalves', birthDate: new Date('1947-12-31'), gender: 'F',
      maritalStatus: 'divorced', phone: '51976015015',
      emergencyContactName: 'Bruna Gonçalves', emergencyContactPhone: '51996015015', emergencyContactRelationship: 'filha',
      bloodType: 'A_pos', admissionDate: monthsAgo(9),
      medicalHistory: { conditions: [{ name: 'Hipertensão', status: 'controlled' }, { name: 'Glaucoma', status: 'active' }, { name: 'Depressão', status: 'controlled' }] },
      monthlyFee: 4300,
    },
    {
      cpf: '99900011116', name: 'Valter Pinto', birthDate: new Date('1936-06-15'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Soraya Pinto', emergencyContactPhone: '51996016016', emergencyContactRelationship: 'filha',
      bloodType: 'O_pos', admissionDate: monthsAgo(28),
      medicalHistory: { conditions: [{ name: 'AVC (sequela)', status: 'active' }, { name: 'Afasia', status: 'active' }, { name: 'Hipertensão', status: 'controlled' }] },
      notes: 'Afasia motora. Comunicação por gestos. Fisioterapia fonoaudiológica.',
      monthlyFee: 6400,
    },
    {
      cpf: '10011122217', name: 'Wilma Araújo', birthDate: new Date('1945-02-08'), gender: 'F',
      maritalStatus: 'widowed', phone: '51976017017',
      emergencyContactName: 'Felipe Araújo', emergencyContactPhone: '51996017017', emergencyContactRelationship: 'neto',
      bloodType: 'B_pos', admissionDate: monthsAgo(7),
      medicalHistory: { conditions: [{ name: 'Diabetes Tipo 2', status: 'controlled' }, { name: 'Neuropatia periférica', status: 'active' }] },
      notes: 'Cuidado especial com os pés. Inspeção diária.',
      monthlyFee: 4500,
    },
    {
      cpf: '11122233318', name: 'Armando Vieira', birthDate: new Date('1938-08-19'), gender: 'M',
      maritalStatus: 'married', phone: '51976018018',
      emergencyContactName: 'Elza Vieira', emergencyContactPhone: '51996018018', emergencyContactRelationship: 'esposa',
      bloodType: 'A_pos', admissionDate: monthsAgo(33),
      medicalHistory: { conditions: [{ name: 'DPOC severo', status: 'active' }, { name: 'Cor pulmonale', status: 'active' }] },
      notes: 'Oxigênio contínuo 2L/min. Dispneia aos mínimos esforços.',
      monthlyFee: 6700,
    },
    {
      cpf: '22233344419', name: 'Conceição Rocha', birthDate: new Date('1943-04-25'), gender: 'F',
      maritalStatus: 'widowed',
      emergencyContactName: 'Diego Rocha', emergencyContactPhone: '51996019019', emergencyContactRelationship: 'neto',
      bloodType: 'O_pos', admissionDate: monthsAgo(16),
      medicalHistory: { conditions: [{ name: 'Alzheimer (moderado)', status: 'active' }, { name: 'Hipertensão', status: 'controlled' }, { name: 'Incontinência urinária', status: 'active' }] },
      notes: 'Fraldas. Agitação vespertina. Música acalma.',
      monthlyFee: 6900,
    },
    {
      cpf: '33344455520', name: 'Dirceu Moura', birthDate: new Date('1941-01-10'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Natália Moura', emergencyContactPhone: '51996020020', emergencyContactRelationship: 'filha',
      bloodType: 'B_neg', admissionDate: monthsAgo(22),
      medicalHistory: { conditions: [{ name: 'Insuficiência Renal Crônica (diálise)', status: 'active' }] },
      notes: 'Hemodiálise 3x/semana (Tue/Thu/Sat). Transporte agendado.',
      monthlyFee: 7400,
    },
    {
      cpf: '44455566621', name: 'Eunice Cavalcante', birthDate: new Date('1950-10-06'), gender: 'F',
      maritalStatus: 'single', phone: '51976021021',
      emergencyContactName: 'Antônio Cavalcante', emergencyContactPhone: '51996021021', emergencyContactRelationship: 'irmão',
      bloodType: 'A_neg', admissionDate: monthsAgo(3),
      medicalHistory: { conditions: [{ name: 'Esquizofrenia controlada', status: 'controlled' }, { name: 'Hipertensão', status: 'controlled' }] },
      notes: 'Medicação psiquiátrica estável. Boa socialização.',
      monthlyFee: 5100,
    },
    {
      cpf: '55566677722', name: 'Fausto Medeiros', birthDate: new Date('1937-07-29'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Juliana Medeiros', emergencyContactPhone: '51996022022', emergencyContactRelationship: 'filha',
      bloodType: 'O_pos', admissionDate: monthsAgo(44),
      medicalHistory: { conditions: [{ name: 'Ca próstata (tratado)', status: 'controlled' }, { name: 'Osteoporose', status: 'active' }, { name: 'Hipertensão', status: 'controlled' }] },
      notes: 'Controle oncológico semestral. Boa resposta ao tratamento.',
      monthlyFee: 5300,
    },
    {
      cpf: '66677788823', name: 'Graça Sampaio', birthDate: new Date('1946-03-13'), gender: 'F',
      maritalStatus: 'divorced', phone: '51976023023',
      emergencyContactName: 'Lucas Sampaio', emergencyContactPhone: '51996023023', emergencyContactRelationship: 'filho',
      bloodType: 'B_pos', admissionDate: monthsAgo(11),
      medicalHistory: { conditions: [{ name: 'Fibromialgia', status: 'active' }, { name: 'Depressão', status: 'controlled' }, { name: 'Hipotireoidismo', status: 'controlled' }] },
      notes: 'Dores difusas. Fisioterapia 2x/semana. Comunicativa.',
      monthlyFee: 4400,
    },
    {
      cpf: '77788899924', name: 'Humberto Leal', birthDate: new Date('1932-11-01'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Camila Leal', emergencyContactPhone: '51996024024', emergencyContactRelationship: 'neta',
      bloodType: 'AB_pos', admissionDate: monthsAgo(60),
      medicalHistory: { conditions: [{ name: 'Alzheimer (avançado)', status: 'active' }, { name: 'Disfagia', status: 'active' }] },
      notes: 'Acamado. Dieta pastosa espessada. Fraldas. SNE em avaliação.',
      monthlyFee: 7500,
    },
    {
      cpf: '88899900025', name: 'Irene Tavares', birthDate: new Date('1949-05-20'), gender: 'F',
      maritalStatus: 'married', phone: '51976025025',
      emergencyContactName: 'Marco Tavares', emergencyContactPhone: '51996025025', emergencyContactRelationship: 'esposo',
      bloodType: 'O_pos', admissionDate: monthsAgo(5),
      medicalHistory: { conditions: [{ name: 'Esclerose Múltipla', status: 'active' }] },
      notes: 'Cadeira de rodas. Fisioterapia intensiva. Humor variável.',
      monthlyFee: 6600,
    },
    {
      cpf: '99900011126', name: 'Joaquim Freitas', birthDate: new Date('1940-09-08'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Daniela Freitas', emergencyContactPhone: '51996026026', emergencyContactRelationship: 'filha',
      bloodType: 'A_pos', admissionDate: monthsAgo(19),
      medicalHistory: { conditions: [{ name: 'Hipertensão', status: 'controlled' }, { name: 'IAM pregresso (2022)', status: 'controlled' }, { name: 'Dislipidemia', status: 'controlled' }] },
      notes: 'Pós-infarto. Ativo. Caminhadas supervisionadas diárias.',
      monthlyFee: 4700,
    },
    {
      cpf: '10011122227', name: 'Lídia Pacheco', birthDate: new Date('1944-06-17'), gender: 'F',
      maritalStatus: 'widowed', phone: '51976027027',
      emergencyContactName: 'Roberto Pacheco', emergencyContactPhone: '51996027027', emergencyContactRelationship: 'filho',
      bloodType: 'B_neg', admissionDate: monthsAgo(26),
      medicalHistory: { conditions: [{ name: 'Diabetes Tipo 2', status: 'controlled' }, { name: 'Insuficiência Venosa', status: 'active' }] },
      notes: 'Meia de compressão diária. Elevação dos membros inferiores.',
      monthlyFee: 4600,
    },
    {
      cpf: '11122233328', name: 'Nelson Queiroz', birthDate: new Date('1935-04-02'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Mônica Queiroz', emergencyContactPhone: '51996028028', emergencyContactRelationship: 'filha',
      bloodType: 'O_pos', admissionDate: monthsAgo(38),
      medicalHistory: { conditions: [{ name: 'Demência mista', status: 'active' }, { name: 'Epilepsia controlada', status: 'controlled' }] },
      notes: 'Risco de queda alto. Cama com grades. Supervisão noturna reforçada.',
      monthlyFee: 6300,
    },
    {
      cpf: '22233344429', name: 'Olga Rezende', birthDate: new Date('1947-08-24'), gender: 'F',
      maritalStatus: 'single', phone: '51976029029',
      emergencyContactName: 'Fernando Rezende', emergencyContactPhone: '51996029029', emergencyContactRelationship: 'sobrinho',
      bloodType: 'A_pos', admissionDate: monthsAgo(13),
      medicalHistory: { conditions: [{ name: 'Lupus eritematoso sistêmico', status: 'controlled' }, { name: 'Osteoporose', status: 'active' }] },
      notes: 'Fotossensível. Evitar exposição solar direta.',
      monthlyFee: 5000,
    },
    {
      cpf: '33344455530', name: 'Paulo Drummond', birthDate: new Date('1938-02-16'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Aline Drummond', emergencyContactPhone: '51996030030', emergencyContactRelationship: 'neta',
      bloodType: 'O_neg', admissionDate: monthsAgo(46),
      medicalHistory: { conditions: [{ name: 'Parkinson (moderado)', status: 'active' }, { name: 'Disfagia leve', status: 'active' }, { name: 'Constipação', status: 'active' }] },
      notes: 'Fisioterapia e fonoaudiologia 2x/semana.',
      monthlyFee: 5700,
    },
    {
      cpf: '44455566631', name: 'Quitéria Monteiro', birthDate: new Date('1942-11-28'), gender: 'F',
      maritalStatus: 'widowed', phone: '51976031031',
      emergencyContactName: 'Tiago Monteiro', emergencyContactPhone: '51996031031', emergencyContactRelationship: 'filho',
      bloodType: 'B_pos', admissionDate: monthsAgo(7),
      medicalHistory: { conditions: [{ name: 'Hipertensão', status: 'controlled' }, { name: 'Ansiedade', status: 'controlled' }] },
      notes: 'Adaptação recente. Saudade da família frequente.',
      monthlyFee: 3900,
    },
    {
      cpf: '55566677732', name: 'Raimundo Castro', birthDate: new Date('1936-05-11'), gender: 'M',
      maritalStatus: 'widowed',
      emergencyContactName: 'Isabela Castro', emergencyContactPhone: '51996032032', emergencyContactRelationship: 'filha',
      bloodType: 'A_neg', admissionDate: monthsAgo(31),
      medicalHistory: { conditions: [{ name: 'Hipertensão', status: 'controlled' }, { name: 'Glaucoma bilateral', status: 'controlled' }, { name: 'Dislipidemia', status: 'controlled' }] },
      notes: 'Colírio 2x/dia. Consulta oftalmológica trimestral.',
      monthlyFee: 4200,
    },
    {
      cpf: '66677788833', name: 'Sônia Fonseca', birthDate: new Date('1945-01-19'), gender: 'F',
      maritalStatus: 'divorced', phone: '51976033033',
      emergencyContactName: 'André Fonseca', emergencyContactPhone: '51996033033', emergencyContactRelationship: 'filho',
      bloodType: 'O_pos', admissionDate: monthsAgo(17),
      medicalHistory: { conditions: [{ name: 'Fibrilação Atrial', status: 'controlled' }, { name: 'Hipertensão', status: 'controlled' }] },
      notes: 'Anticoagulada. INR mensal. Cuidado com cortes e quedas.',
      monthlyFee: 5100,
    },
  ];

  const residentIds: Record<string, string> = {};

  for (const r of residentsData) {
    const { monthlyFee, ...data } = r;
    const created = await prisma.resident.upsert({
      where: { cpf: r.cpf },
      update: { status: 'active' },
      create: {
        houseId: HOUSE_ID,
        status: 'active',
        city: 'Porto Alegre',
        state: 'RS',
        createdBy: admin.id,
        updatedBy: admin.id,
        ...data,
      },
    });
    residentIds[r.cpf] = created.id;
    void monthlyFee; // used below for financial records
  }

  console.log(`✅ ${residentsData.length} residentes criados/atualizados`);

  // ── Medications (subset — os mais importantes) ───────────────────────────────

  type MedInput = { id: string; cpf: string; name: string; ingredient: string; dosage: string; unit: string; freq: string; times: number; schedule: string[]; prescriber: string; instructions?: string; caregiverInstructions?: string };

  const medsData: MedInput[] = [
    // Maria da Silva
    { id: '00000000-1000-0000-0000-000000000001', cpf: '11144477735', name: 'Losartana', ingredient: 'Losartana Potássica', dosage: '50', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dr. Carlos Medeiros', instructions: 'Tomar em jejum', caregiverInstructions: 'Monitorar PA' },
    { id: '00000000-1000-0000-0000-000000000002', cpf: '11144477735', name: 'AAS', ingredient: 'Ácido Acetilsalicílico', dosage: '100', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dr. Carlos Medeiros', instructions: 'Após refeição' },
    { id: '00000000-1000-0000-0000-000000000003', cpf: '11144477735', name: 'Omeprazol', ingredient: 'Omeprazol', dosage: '20', unit: 'mg', freq: '1x ao dia (noite)', times: 1, schedule: ['20:00'], prescriber: 'Dr. Carlos Medeiros' },
    // José Oliveira
    { id: '00000000-1000-0000-0000-000000000010', cpf: '22233344405', name: 'Metformina', ingredient: 'Metformina Cloridrato', dosage: '850', unit: 'mg', freq: '2x ao dia', times: 2, schedule: ['08:00', '20:00'], prescriber: 'Dra. Ana Paula Costa', instructions: 'Com as refeições', caregiverInstructions: 'Glicemia 2h após' },
    { id: '00000000-1000-0000-0000-000000000011', cpf: '22233344405', name: 'Sinvastatina', ingredient: 'Sinvastatina', dosage: '20', unit: 'mg', freq: '1x ao dia (noite)', times: 1, schedule: ['22:00'], prescriber: 'Dra. Ana Paula Costa' },
    { id: '00000000-1000-0000-0000-000000000012', cpf: '22233344405', name: 'Glibenclamida', ingredient: 'Glibenclamida', dosage: '5', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['07:00'], prescriber: 'Dra. Ana Paula Costa', instructions: 'Antes do café' },
    // Francisco Pereira
    { id: '00000000-1000-0000-0000-000000000020', cpf: '33344455508', name: 'Levodopa + Carbidopa', ingredient: 'Levodopa 250mg + Carbidopa 25mg', dosage: '250', unit: 'mg', freq: '3x ao dia', times: 3, schedule: ['08:00', '14:00', '20:00'], prescriber: 'Dr. Roberto Neurologia', instructions: 'NÃO tomar com proteínas', caregiverInstructions: 'Observar tremores e rigidez' },
    { id: '00000000-1000-0000-0000-000000000021', cpf: '33344455508', name: 'Sertralina', ingredient: 'Sertralina Cloridrato', dosage: '50', unit: 'mg', freq: '1x ao dia (manhã)', times: 1, schedule: ['08:00'], prescriber: 'Dra. Beatriz Psiquiatria' },
    // Antônia Rodrigues — Alzheimer
    { id: '00000000-1000-0000-0000-000000000030', cpf: '44455566601', name: 'Donepezila', ingredient: 'Donepezila Cloridrato', dosage: '10', unit: 'mg', freq: '1x ao dia (noite)', times: 1, schedule: ['21:00'], prescriber: 'Dr. Paulo Neurologia', caregiverInstructions: 'Observar agitação noturna' },
    { id: '00000000-1000-0000-0000-000000000031', cpf: '44455566601', name: 'Enalapril', ingredient: 'Enalapril Maleato', dosage: '10', unit: 'mg', freq: '2x ao dia', times: 2, schedule: ['08:00', '20:00'], prescriber: 'Dra. Ana Paula Costa' },
    // Benedito Santos — ICC
    { id: '00000000-1000-0000-0000-000000000040', cpf: '55566677702', name: 'Furosemida', ingredient: 'Furosemida', dosage: '40', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dr. Henrique Cardiologia', caregiverInstructions: 'Pesar diariamente. Avisar se ganho >1kg/dia' },
    { id: '00000000-1000-0000-0000-000000000041', cpf: '55566677702', name: 'Digoxina', ingredient: 'Digoxina', dosage: '0.25', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dr. Henrique Cardiologia', caregiverInstructions: 'Verificar FC antes. NÃO dar se FC < 60bpm' },
    { id: '00000000-1000-0000-0000-000000000042', cpf: '55566677702', name: 'Carvedilol', ingredient: 'Carvedilol', dosage: '6.25', unit: 'mg', freq: '2x ao dia', times: 2, schedule: ['08:00', '20:00'], prescriber: 'Dr. Henrique Cardiologia' },
    { id: '00000000-1000-0000-0000-000000000043', cpf: '55566677702', name: 'Insulina NPH', ingredient: 'Insulina Humana NPH', dosage: '20', unit: 'ui', freq: '2x ao dia', times: 2, schedule: ['07:30', '19:30'], prescriber: 'Dra. Ana Paula Costa', caregiverInstructions: 'Aplicar subcutâneo. Rodízio de locais.' },
    // Carmen Ferreira — AVC
    { id: '00000000-1000-0000-0000-000000000050', cpf: '66677788803', name: 'Clopidogrel', ingredient: 'Clopidogrel', dosage: '75', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dra. Marina Neurologia' },
    { id: '00000000-1000-0000-0000-000000000051', cpf: '66677788803', name: 'Atorvastatina', ingredient: 'Atorvastatina Cálcica', dosage: '40', unit: 'mg', freq: '1x ao dia (noite)', times: 1, schedule: ['22:00'], prescriber: 'Dra. Marina Neurologia' },
    { id: '00000000-1000-0000-0000-000000000052', cpf: '66677788803', name: 'Losartana', ingredient: 'Losartana Potássica', dosage: '100', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dra. Marina Neurologia' },
    // Geraldo Costa — Demência vascular
    { id: '00000000-1000-0000-0000-000000000060', cpf: '77788899904', name: 'Memantina', ingredient: 'Memantina Cloridrato', dosage: '20', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dr. Paulo Neurologia' },
    { id: '00000000-1000-0000-0000-000000000061', cpf: '77788899904', name: 'Haloperidol', ingredient: 'Haloperidol', dosage: '0.5', unit: 'mg', freq: '1x ao dia (noite)', times: 1, schedule: ['21:00'], prescriber: 'Dr. Paulo Neurologia', instructions: 'Somente se agitação intensa' },
    // Helena Carvalho — Osteoporose
    { id: '00000000-1000-0000-0000-000000000070', cpf: '88899900005', name: 'Alendronato', ingredient: 'Alendronato Sódico', dosage: '70', unit: 'mg', freq: '1x por semana (segunda)', times: 1, schedule: ['07:00'], prescriber: 'Dr. Gustavo Ortopedia', instructions: 'Em jejum. Ficar em pé 30min após' },
    { id: '00000000-1000-0000-0000-000000000071', cpf: '88899900005', name: 'Levotiroxina', ingredient: 'Levotiroxina Sódica', dosage: '50', unit: 'mcg', freq: '1x ao dia', times: 1, schedule: ['07:00'], prescriber: 'Dra. Lucia Endocrinologia', instructions: 'Em jejum, 30min antes do café' },
    { id: '00000000-1000-0000-0000-000000000072', cpf: '88899900005', name: 'Calcio + Vit D', ingredient: 'Carbonato de Cálcio 1g + Vitamina D 400UI', dosage: '1000', unit: 'mg', freq: '2x ao dia', times: 2, schedule: ['08:00', '20:00'], prescriber: 'Dr. Gustavo Ortopedia' },
    // Iracema Lima — DPOC
    { id: '00000000-1000-0000-0000-000000000080', cpf: '99900011106', name: 'Salbutamol Spray', ingredient: 'Salbutamol', dosage: '100', unit: 'mcg', freq: 'SOS (até 4x/dia)', times: 4, schedule: ['08:00', '14:00', '20:00', '23:00'], prescriber: 'Dr. Ricardo Pneumologia', caregiverInstructions: '2 jatos. Avisar se frequência aumentar.' },
    { id: '00000000-1000-0000-0000-000000000081', cpf: '99900011106', name: 'Budesonida Spray', ingredient: 'Budesonida', dosage: '200', unit: 'mcg', freq: '2x ao dia', times: 2, schedule: ['08:00', '20:00'], prescriber: 'Dr. Ricardo Pneumologia', instructions: 'Bochechar após uso' },
    // Luzia Barbosa — Depressão
    { id: '00000000-1000-0000-0000-000000000090', cpf: '11122233308', name: 'Escitalopram', ingredient: 'Escitalopram Oxalato', dosage: '10', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dra. Fernanda Psiquiatria' },
    { id: '00000000-1000-0000-0000-000000000091', cpf: '11122233308', name: 'Clonazepam', ingredient: 'Clonazepam', dosage: '0.5', unit: 'mg', freq: '1x ao dia (noite)', times: 1, schedule: ['22:00'], prescriber: 'Dra. Fernanda Psiquiatria', instructions: 'Controle especial — verificar uso correto' },
    // Sônia Fonseca — Fibrilação Atrial
    { id: '00000000-1000-0000-0000-000000000100', cpf: '66677788833', name: 'Warfarina', ingredient: 'Varfarina Sódica', dosage: '5', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['17:00'], prescriber: 'Dr. Henrique Cardiologia', caregiverInstructions: 'INR mensal. Cuidado com cortes. Evitar AINEs.' },
    { id: '00000000-1000-0000-0000-000000000101', cpf: '66677788833', name: 'Bisoprolol', ingredient: 'Bisoprolol', dosage: '5', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dr. Henrique Cardiologia', caregiverInstructions: 'Verificar FC. Não dar se < 55bpm' },
    // Paulo Drummond — Parkinson moderado
    { id: '00000000-1000-0000-0000-000000000110', cpf: '33344455530', name: 'Pramipexol', ingredient: 'Pramipexol', dosage: '0.5', unit: 'mg', freq: '3x ao dia', times: 3, schedule: ['08:00', '14:00', '20:00'], prescriber: 'Dr. Paulo Neurologia', instructions: 'Com alimentos' },
    { id: '00000000-1000-0000-0000-000000000111', cpf: '33344455530', name: 'Levodopa + Carbidopa', ingredient: 'Levodopa 100mg + Carbidopa 25mg', dosage: '100', unit: 'mg', freq: '3x ao dia', times: 3, schedule: ['08:00', '14:00', '20:00'], prescriber: 'Dr. Paulo Neurologia', instructions: '30min antes das refeições' },
    // Joaquim Freitas — pós-IAM
    { id: '00000000-1000-0000-0000-000000000120', cpf: '99900011126', name: 'AAS', ingredient: 'Ácido Acetilsalicílico', dosage: '100', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dr. Henrique Cardiologia' },
    { id: '00000000-1000-0000-0000-000000000121', cpf: '99900011126', name: 'Atorvastatina', ingredient: 'Atorvastatina Cálcica', dosage: '80', unit: 'mg', freq: '1x ao dia (noite)', times: 1, schedule: ['22:00'], prescriber: 'Dr. Henrique Cardiologia' },
    { id: '00000000-1000-0000-0000-000000000122', cpf: '99900011126', name: 'Enalapril', ingredient: 'Enalapril Maleato', dosage: '5', unit: 'mg', freq: '2x ao dia', times: 2, schedule: ['08:00', '20:00'], prescriber: 'Dr. Henrique Cardiologia' },
    { id: '00000000-1000-0000-0000-000000000123', cpf: '99900011126', name: 'Metoprolol', ingredient: 'Metoprolol Succinato', dosage: '25', unit: 'mg', freq: '1x ao dia', times: 1, schedule: ['08:00'], prescriber: 'Dr. Henrique Cardiologia' },
  ];

  for (const m of medsData) {
    const rid = residentIds[m.cpf];
    if (!rid) continue;
    await prisma.medication.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        residentId: rid,
        name: m.name,
        activeIngredient: m.ingredient,
        dosage: m.dosage,
        measurementUnit: m.unit as never,
        frequencyDescription: m.freq,
        timesPerDay: m.times,
        scheduledTimes: m.schedule,
        startDate: monthsAgo(Math.floor(Math.random() * 12) + 1),
        prescriberName: m.prescriber,
        specialInstructions: m.instructions,
        instructionsForCaregiver: m.caregiverInstructions,
        status: 'active',
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }

  console.log(`✅ ${medsData.length} medicamentos criados/atualizados`);

  // ── Financial Records ────────────────────────────────────────────────────────

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const fees: Record<string, number> = {};
  residentsData.forEach(r => { fees[r.cpf] = r.monthlyFee; });

  let finId = 1;
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  for (const r of residentsData) {
    const rid = residentIds[r.cpf];
    if (!rid) continue;
    const fee = fees[r.cpf] ?? 4500;
    const idPrev = `00000000-2000-0000-${String(finId).padStart(4, '0')}-000000000001`;
    const idCurr = `00000000-2000-0000-${String(finId).padStart(4, '0')}-000000000002`;

    const prevMonthName = monthNames[prevMonth.getMonth()]!;
    const currMonthName = monthNames[today.getMonth()]!;
    const year = today.getFullYear();

    // previous month — mostly paid, some overdue
    const prevStatus = finId % 7 === 0 ? 'overdue' : 'paid';
    await prisma.financialRecord.upsert({
      where: { id: idPrev },
      update: {},
      create: {
        id: idPrev,
        houseId: HOUSE_ID,
        residentId: rid,
        type: 'charge',
        description: `Mensalidade ${prevMonthName}/${year}`,
        amount: fee,
        category: 'monthly_fee',
        status: prevStatus,
        issueDate: prevMonth,
        dueDate: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 5),
        paidDate: prevStatus === 'paid' ? new Date(prevMonth.getFullYear(), prevMonth.getMonth(), Math.floor(Math.random() * 4) + 2) : undefined,
        createdBy: admin.id,
      },
    });

    // current month — pending or paid
    const currStatus = finId % 4 === 0 ? 'paid' : 'pending';
    await prisma.financialRecord.upsert({
      where: { id: idCurr },
      update: {},
      create: {
        id: idCurr,
        houseId: HOUSE_ID,
        residentId: rid,
        type: 'charge',
        description: `Mensalidade ${currMonthName}/${year}`,
        amount: fee,
        category: 'monthly_fee',
        status: currStatus,
        issueDate: firstDay,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 5),
        paidDate: currStatus === 'paid' ? new Date(today.getFullYear(), today.getMonth(), 2) : undefined,
        createdBy: admin.id,
      },
    });

    finId++;
  }

  // Extra charges (medications, services)
  const extraCharges = [
    { rid: residentIds['33344455508']!, desc: 'Fisioterapia — ' + monthNames[today.getMonth()] + '/' + today.getFullYear(), amount: 800, cat: 'extra_service', status: 'pending' },
    { rid: residentIds['66677788803']!, desc: 'Fisioterapia — ' + monthNames[today.getMonth()] + '/' + today.getFullYear(), amount: 800, cat: 'extra_service', status: 'paid' },
    { rid: residentIds['88899900005']!, desc: 'Fisioterapia — ' + monthNames[today.getMonth()] + '/' + today.getFullYear(), amount: 800, cat: 'extra_service', status: 'pending' },
    { rid: residentIds['33344455530']!, desc: 'Fonoaudiologia — ' + monthNames[today.getMonth()] + '/' + today.getFullYear(), amount: 500, cat: 'extra_service', status: 'pending' },
    { rid: residentIds['55566677702']!, desc: 'Suprimentos médicos (fraldas, sonda)', amount: 350, cat: 'medicine', status: 'paid' },
    { rid: residentIds['77788899924']!, desc: 'Suprimentos médicos (fraldas, espessante)', amount: 420, cat: 'medicine', status: 'paid' },
    { rid: residentIds['11122233318']!, desc: 'Cilindro de oxigênio — aluguel mensal', amount: 280, cat: 'extra_service', status: 'paid' },
    { rid: residentIds['99900011106']!, desc: 'Concentrador de oxigênio — manutenção', amount: 150, cat: 'extra_service', status: 'paid' },
  ];

  for (let i = 0; i < extraCharges.length; i++) {
    const ec = extraCharges[i]!;
    const id = `00000000-3000-0000-0000-${String(i + 1).padStart(12, '0')}`;
    if (!ec.rid) continue;
    await prisma.financialRecord.upsert({
      where: { id },
      update: {},
      create: {
        id,
        houseId: HOUSE_ID,
        residentId: ec.rid,
        type: 'charge',
        description: ec.desc,
        amount: ec.amount,
        category: ec.cat as never,
        status: ec.status as never,
        issueDate: firstDay,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 15),
        paidDate: ec.status === 'paid' ? daysAgo(5) : undefined,
        createdBy: admin.id,
      },
    });
  }

  console.log('✅ Registros financeiros criados');

  // ── Work Schedules ───────────────────────────────────────────────────────────

  const allStaff = await prisma.user.findMany({ where: { houseId: HOUSE_ID, active: true } });
  const shifts = ['morning', 'afternoon', 'night'] as const;

  for (let dayOffset = -14; dayOffset <= 21; dayOffset++) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    const dateStr = d.toISOString().split('T')[0]!;

    for (let i = 0; i < allStaff.length; i++) {
      const user = allStaff[i]!;
      const shift = shifts[(i + Math.abs(dayOffset)) % shifts.length]!;

      const existing = await prisma.workSchedule.findFirst({
        where: { userId: user.id, scheduleDate: new Date(dateStr), houseId: HOUSE_ID },
      });

      if (!existing) {
        await prisma.workSchedule.create({
          data: {
            houseId: HOUSE_ID,
            userId: user.id,
            scheduleDate: new Date(dateStr),
            shift,
            status: dayOffset < 0 ? 'present' : dayOffset === 0 ? 'present' : 'scheduled',
            createdBy: admin.id,
          },
        });
      }
    }
  }

  console.log('✅ Escalas criadas');

  // ── Visitors ─────────────────────────────────────────────────────────────────

  type VisitorInput = { id: string; cpf: string; name: string; rel: string; phone: string; daysAgo: number; checkedOut: boolean };

  const visitorsData: VisitorInput[] = [
    { id: '00000000-4000-0000-0000-000000000001', cpf: '11144477735', name: 'João Silva', rel: 'Filho', phone: '51999876543', daysAgo: 0, checkedOut: false },
    { id: '00000000-4000-0000-0000-000000000002', cpf: '22233344405', name: 'Ana Oliveira', rel: 'Esposa', phone: '51998765432', daysAgo: 1, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000003', cpf: '33344455508', name: 'Luciana Pereira', rel: 'Filha', phone: '51997654321', daysAgo: 2, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000004', cpf: '11144477735', name: 'Carlos Silva', rel: 'Neto', phone: '51988884444', daysAgo: 3, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000005', cpf: '44455566601', name: 'Carlos Rodrigues', rel: 'Filho', phone: '51996001001', daysAgo: 1, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000006', cpf: '55566677702', name: 'Vera Santos', rel: 'Filha', phone: '51996002002', daysAgo: 0, checkedOut: false },
    { id: '00000000-4000-0000-0000-000000000007', cpf: '66677788803', name: 'Pedro Ferreira', rel: 'Esposo', phone: '51996003003', daysAgo: 0, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000008', cpf: '88899900005', name: 'Renata Carvalho', rel: 'Filha', phone: '51996005005', daysAgo: 2, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000009', cpf: '66677788813', name: 'Eduardo Souza', rel: 'Filho', phone: '51996013013', daysAgo: 4, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000010', cpf: '44455566621', name: 'Antônio Cavalcante', rel: 'Irmão', phone: '51996021021', daysAgo: 5, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000011', cpf: '33344455530', name: 'Aline Drummond', rel: 'Neta', phone: '51996030030', daysAgo: 1, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000012', cpf: '99900011126', name: 'Daniela Freitas', rel: 'Filha', phone: '51996026026', daysAgo: 0, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000013', cpf: '77788899904', name: 'Adriana Costa', rel: 'Neta', phone: '51996004004', daysAgo: 6, checkedOut: true },
    { id: '00000000-4000-0000-0000-000000000014', cpf: '11122233308', name: 'Fábio Barbosa', rel: 'Esposo', phone: '51996008008', daysAgo: 0, checkedOut: false },
    { id: '00000000-4000-0000-0000-000000000015', cpf: '55566677732', name: 'Isabela Castro', rel: 'Filha', phone: '51996032032', daysAgo: 3, checkedOut: true },
  ];

  for (const v of visitorsData) {
    const rid = residentIds[v.cpf];
    if (!rid) continue;
    const ci = new Date();
    ci.setDate(ci.getDate() - v.daysAgo);
    ci.setHours(14, 0, 0, 0);

    await prisma.visitor.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        residentId: rid,
        name: v.name,
        relationship: v.rel,
        phone: v.phone,
        visitDate: new Date(ci.toISOString().split('T')[0]!),
        visitTimeIn: '14:00',
        visitTimeOut: v.checkedOut ? '16:30' : null,
      },
    });
  }

  console.log('✅ Visitas criadas');

  console.log('\n📋 Credenciais de acesso:');
  console.log('  Admin: admin@quatro.com / senha123');
  console.log('  Diretora: diretora@quatro.com / senha123');
  console.log('  Enfermeira: camila@quatro.com / senha123');
  console.log('  Cuidador: roberto@quatro.com / senha123');
  console.log('  Financeiro: financeiro@quatro.com / senha123');
  console.log('\n👴 36 residentes criados — Casa Quatro Estações (90% de ocupação)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
