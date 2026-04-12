/**
 * Seed de desenvolvimento: cria 2 casas + admin + 3 residentes de teste.
 * Execute com: pnpm --filter api db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Houses ──────────────────────────────────────────────────────────────────

  const house1 = await prisma.house.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Casa Geriátrica Quatro Estações',
      address: 'Rua das Flores, 100',
      city: 'Porto Alegre',
      state: 'RS',
      phone: '51333334444',
      email: 'quatro@casageri.com.br',
      ownerName: 'Maria Oliveira',
    },
  });

  const house2 = await prisma.house.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Cantinho da Vovó',
      address: 'Av. Paulista, 500',
      city: 'São Paulo',
      state: 'SP',
      phone: '11333334444',
      email: 'cantinho@casageri.com.br',
      ownerName: 'Joana Pereira',
    },
  });

  // ─── Admins ───────────────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash('senha123', 12);

  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@quatro.com' },
    update: {},
    create: {
      houseId: house1.id,
      email: 'admin@quatro.com',
      passwordHash,
      name: 'Admin Quatro Estações',
      role: 'admin',
      phone: '51999990001',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@cantinho.com' },
    update: {},
    create: {
      houseId: house2.id,
      email: 'admin@cantinho.com',
      passwordHash,
      name: 'Admin Cantinho da Vovó',
      role: 'admin',
      phone: '11999990001',
    },
  });

  // ─── Residents ────────────────────────────────────────────────────────────────

  await prisma.resident.upsert({
    where: { cpf: '11144477735' },
    update: {},
    create: {
      houseId: house1.id,
      name: 'Maria da Silva',
      cpf: '11144477735',
      rg: '1234567',
      birthDate: new Date('1945-05-15'),
      gender: 'F',
      maritalStatus: 'widowed',
      phone: '51987654321',
      emergencyContactName: 'João Silva',
      emergencyContactPhone: '51999876543',
      emergencyContactRelationship: 'filho',
      bloodType: 'O_pos',
      admissionDate: new Date('2020-01-10'),
      city: 'Porto Alegre',
      state: 'RS',
      medicalHistory: {
        allergies: [{ allergen: 'Penicilina', severity: 'severe', reaction: 'Anafilaxia' }],
        conditions: [{ name: 'Hipertensão', status: 'controlled', treatment: 'Losartana 50mg' }],
      },
      notes: 'Gosta de ler e ouvir música',
      createdBy: admin1.id,
      updatedBy: admin1.id,
    },
  });

  await prisma.resident.upsert({
    where: { cpf: '22233344405' },
    update: {},
    create: {
      houseId: house1.id,
      name: 'José Oliveira',
      cpf: '22233344405',
      birthDate: new Date('1938-11-20'),
      gender: 'M',
      maritalStatus: 'married',
      phone: '51912345678',
      emergencyContactName: 'Ana Oliveira',
      emergencyContactPhone: '51998765432',
      emergencyContactRelationship: 'esposa',
      bloodType: 'A_pos',
      admissionDate: new Date('2021-06-15'),
      medicalHistory: {
        conditions: [
          { name: 'Diabetes Tipo 2', status: 'controlled', treatment: 'Metformina 850mg' },
          { name: 'Artrose', status: 'active' },
        ],
      },
      createdBy: admin1.id,
      updatedBy: admin1.id,
    },
  });

  // ─── Medications ──────────────────────────────────────────────────────────────

  const maria = await prisma.resident.findFirst({ where: { cpf: '11144477735' } });
  const jose = await prisma.resident.findFirst({ where: { cpf: '22233344405' } });

  if (maria) {
    await prisma.medication.upsert({
      where: { id: '00000000-0000-0000-0000-000000000010' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000010',
        residentId: maria.id,
        name: 'Losartana',
        activeIngredient: 'Losartana Potássica',
        dosage: '50',
        measurementUnit: 'mg',
        frequencyDescription: '1x ao dia',
        timesPerDay: 1,
        scheduledTimes: ['08:00'],
        startDate: new Date('2024-01-15'),
        prescriberName: 'Dr. Carlos Medeiros',
        prescriberCrm: '45678/RS',
        specialInstructions: 'Tomar em jejum',
        instructionsForCaregiver: 'Monitorar pressão arterial após administração',
        sideEffects: 'Tontura, hipotensão postural',
        status: 'active',
        createdBy: admin1.id,
        updatedBy: admin1.id,
      },
    });

    await prisma.medication.upsert({
      where: { id: '00000000-0000-0000-0000-000000000011' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000011',
        residentId: maria.id,
        name: 'AAS',
        activeIngredient: 'Ácido Acetilsalicílico',
        dosage: '100',
        measurementUnit: 'mg',
        frequencyDescription: '1x ao dia',
        timesPerDay: 1,
        scheduledTimes: ['08:00'],
        startDate: new Date('2024-01-15'),
        prescriberName: 'Dr. Carlos Medeiros',
        prescriberCrm: '45678/RS',
        specialInstructions: 'Tomar após refeição',
        interactionWarnings: 'Não usar com anticoagulantes',
        status: 'active',
        createdBy: admin1.id,
        updatedBy: admin1.id,
      },
    });
  }

  if (jose) {
    await prisma.medication.upsert({
      where: { id: '00000000-0000-0000-0000-000000000012' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000012',
        residentId: jose.id,
        name: 'Metformina',
        activeIngredient: 'Metformina Cloridrato',
        dosage: '850',
        measurementUnit: 'mg',
        frequencyDescription: '2x ao dia',
        timesPerDay: 2,
        scheduledTimes: ['08:00', '20:00'],
        startDate: new Date('2024-06-01'),
        prescriberName: 'Dra. Ana Paula Costa',
        prescriberCrm: '12345/SP',
        specialInstructions: 'Tomar com as refeições para reduzir náusea',
        instructionsForCaregiver: 'Monitorar glicemia 2h após administração',
        sideEffects: 'Náusea, diarreia, dor abdominal',
        status: 'active',
        createdBy: admin1.id,
        updatedBy: admin1.id,
      },
    });
  }

  console.log('✅ Seed concluído!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('  Casa 1: admin@quatro.com / senha123');
  console.log('  Casa 2: admin@cantinho.com / senha123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
