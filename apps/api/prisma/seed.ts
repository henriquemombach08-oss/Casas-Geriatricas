/**
 * Seed: cria casa + admin + residentes + medicamentos + financeiro + escalas + visitantes.
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

  await prisma.house.upsert({
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
      houseId: '00000000-0000-0000-0000-000000000002',
      email: 'admin@cantinho.com',
      passwordHash,
      name: 'Admin Cantinho da Vovó',
      role: 'admin',
      phone: '11999990001',
    },
  });

  // ─── Funcionários ─────────────────────────────────────────────────────────────

  const nurse1 = await prisma.user.upsert({
    where: { email: 'enfermeira@quatro.com' },
    update: {},
    create: {
      houseId: house1.id,
      email: 'enfermeira@quatro.com',
      passwordHash,
      name: 'Camila Souza',
      role: 'nurse',
      phone: '51988881111',
    },
  });

  const caregiver1 = await prisma.user.upsert({
    where: { email: 'cuidador@quatro.com' },
    update: {},
    create: {
      houseId: house1.id,
      email: 'cuidador@quatro.com',
      passwordHash,
      name: 'Roberto Lima',
      role: 'caregiver',
      phone: '51988882222',
    },
  });

  // ─── Residents ────────────────────────────────────────────────────────────────

  const maria = await prisma.resident.upsert({
    where: { cpf: '11144477735' },
    update: { status: 'active' },
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

  const jose = await prisma.resident.upsert({
    where: { cpf: '22233344405' },
    update: { status: 'active' },
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

  const fulano = await prisma.resident.upsert({
    where: { cpf: '33344455508' },
    update: { status: 'active' },
    create: {
      houseId: house1.id,
      name: 'Francisco Pereira',
      cpf: '33344455508',
      birthDate: new Date('1942-03-08'),
      gender: 'M',
      maritalStatus: 'divorced',
      phone: '51976543210',
      emergencyContactName: 'Luciana Pereira',
      emergencyContactPhone: '51997654321',
      emergencyContactRelationship: 'filha',
      bloodType: 'B_pos',
      admissionDate: new Date('2022-09-01'),
      medicalHistory: {
        conditions: [
          { name: 'Parkinson', status: 'active', treatment: 'Levodopa 250mg' },
          { name: 'Depressão', status: 'controlled', treatment: 'Sertralina 50mg' },
        ],
      },
      notes: 'Mobilidade reduzida. Necessita auxílio para locomoção.',
      createdBy: admin1.id,
      updatedBy: admin1.id,
    },
  });

  // ─── Medications ──────────────────────────────────────────────────────────────

  // Maria da Silva — Losartana 08:00
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

  // Maria da Silva — AAS 08:00
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

  // Maria da Silva — Omeprazol 20:00
  await prisma.medication.upsert({
    where: { id: '00000000-0000-0000-0000-000000000013' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000013',
      residentId: maria.id,
      name: 'Omeprazol',
      activeIngredient: 'Omeprazol',
      dosage: '20',
      measurementUnit: 'mg',
      frequencyDescription: '1x ao dia (noite)',
      timesPerDay: 1,
      scheduledTimes: ['20:00'],
      startDate: new Date('2024-02-01'),
      prescriberName: 'Dr. Carlos Medeiros',
      prescriberCrm: '45678/RS',
      status: 'active',
      createdBy: admin1.id,
      updatedBy: admin1.id,
    },
  });

  // José Oliveira — Metformina 08:00 e 20:00
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

  // José Oliveira — Sinvastatina 22:00
  await prisma.medication.upsert({
    where: { id: '00000000-0000-0000-0000-000000000014' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000014',
      residentId: jose.id,
      name: 'Sinvastatina',
      activeIngredient: 'Sinvastatina',
      dosage: '20',
      measurementUnit: 'mg',
      frequencyDescription: '1x ao dia (noite)',
      timesPerDay: 1,
      scheduledTimes: ['22:00'],
      startDate: new Date('2024-03-10'),
      prescriberName: 'Dra. Ana Paula Costa',
      status: 'active',
      createdBy: admin1.id,
      updatedBy: admin1.id,
    },
  });

  // Francisco Pereira — Levodopa 08:00, 14:00, 20:00
  await prisma.medication.upsert({
    where: { id: '00000000-0000-0000-0000-000000000015' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000015',
      residentId: fulano.id,
      name: 'Levodopa + Carbidopa',
      activeIngredient: 'Levodopa 250mg + Carbidopa 25mg',
      dosage: '250',
      measurementUnit: 'mg',
      frequencyDescription: '3x ao dia',
      timesPerDay: 3,
      scheduledTimes: ['08:00', '14:00', '20:00'],
      startDate: new Date('2023-11-01'),
      prescriberName: 'Dr. Roberto Neurologia',
      prescriberCrm: '78901/RS',
      specialInstructions: 'NÃO tomar junto com proteínas — aguardar 30 min antes das refeições',
      instructionsForCaregiver: 'Observar tremores e rigidez. Registrar qualquer piora.',
      status: 'active',
      createdBy: admin1.id,
      updatedBy: admin1.id,
    },
  });

  // Francisco Pereira — Sertralina 08:00
  await prisma.medication.upsert({
    where: { id: '00000000-0000-0000-0000-000000000016' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000016',
      residentId: fulano.id,
      name: 'Sertralina',
      activeIngredient: 'Sertralina Cloridrato',
      dosage: '50',
      measurementUnit: 'mg',
      frequencyDescription: '1x ao dia (manhã)',
      timesPerDay: 1,
      scheduledTimes: ['08:00'],
      startDate: new Date('2023-08-15'),
      prescriberName: 'Dra. Beatriz Psiquiatria',
      prescriberCrm: '56789/RS',
      status: 'active',
      createdBy: admin1.id,
      updatedBy: admin1.id,
    },
  });

  // ─── Financial Records ────────────────────────────────────────────────────────

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5);

  // Maria — mensalidade paga
  await prisma.financialRecord.upsert({
    where: { id: '00000000-0000-0000-0000-100000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-100000000001',
      houseId: house1.id,
      residentId: maria.id,
      type: 'charge',
      description: 'Mensalidade Abril/2026',
      amount: 4500.00,
      category: 'monthly_fee',
      status: 'paid',
      issueDate: firstDay,
      dueDate: new Date(today.getFullYear(), today.getMonth(), 5),
      paidDate: new Date(today.getFullYear(), today.getMonth(), 3),
      createdBy: admin1.id,
    },
  });

  // Maria — mensalidade próximo mês (pendente)
  await prisma.financialRecord.upsert({
    where: { id: '00000000-0000-0000-0000-100000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-100000000002',
      houseId: house1.id,
      residentId: maria.id,
      type: 'charge',
      description: 'Mensalidade Maio/2026',
      amount: 4500.00,
      category: 'monthly_fee',
      status: 'pending',
      issueDate: lastDay,
      dueDate: nextMonth,
      createdBy: admin1.id,
    },
  });

  // Maria — medicamentos extra
  await prisma.financialRecord.upsert({
    where: { id: '00000000-0000-0000-0000-100000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-100000000003',
      houseId: house1.id,
      residentId: maria.id,
      type: 'charge',
      description: 'Medicamentos especiais — Março/2026',
      amount: 320.50,
      category: 'medicine',
      status: 'paid',
      issueDate: new Date('2026-03-10'),
      dueDate: new Date('2026-03-20'),
      paidDate: new Date('2026-03-18'),
      createdBy: admin1.id,
    },
  });

  // José — mensalidade vencida
  await prisma.financialRecord.upsert({
    where: { id: '00000000-0000-0000-0000-100000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-100000000004',
      houseId: house1.id,
      residentId: jose.id,
      type: 'charge',
      description: 'Mensalidade Março/2026',
      amount: 3800.00,
      category: 'monthly_fee',
      status: 'overdue',
      issueDate: new Date('2026-03-01'),
      dueDate: new Date('2026-03-05'),
      createdBy: admin1.id,
    },
  });

  // José — mensalidade atual (pendente)
  await prisma.financialRecord.upsert({
    where: { id: '00000000-0000-0000-0000-100000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-100000000005',
      houseId: house1.id,
      residentId: jose.id,
      type: 'charge',
      description: 'Mensalidade Abril/2026',
      amount: 3800.00,
      category: 'monthly_fee',
      status: 'pending',
      issueDate: firstDay,
      dueDate: new Date(today.getFullYear(), today.getMonth(), 5),
      createdBy: admin1.id,
    },
  });

  // Francisco — mensalidade paga
  await prisma.financialRecord.upsert({
    where: { id: '00000000-0000-0000-0000-100000000006' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-100000000006',
      houseId: house1.id,
      residentId: fulano.id,
      type: 'charge',
      description: 'Mensalidade Abril/2026',
      amount: 5200.00,
      category: 'monthly_fee',
      status: 'paid',
      issueDate: firstDay,
      dueDate: new Date(today.getFullYear(), today.getMonth(), 5),
      paidDate: new Date(today.getFullYear(), today.getMonth(), 2),
      createdBy: admin1.id,
    },
  });

  // Francisco — serviço fisioterapia
  await prisma.financialRecord.upsert({
    where: { id: '00000000-0000-0000-0000-100000000007' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-100000000007',
      houseId: house1.id,
      residentId: fulano.id,
      type: 'charge',
      description: 'Fisioterapia — Abril/2026',
      amount: 800.00,
      category: 'extra_service',
      status: 'pending',
      issueDate: firstDay,
      dueDate: new Date(today.getFullYear(), today.getMonth(), 15),
      createdBy: admin1.id,
    },
  });

  // ─── Work Schedules ───────────────────────────────────────────────────────────

  const users = [admin1, nurse1, caregiver1];
  const shifts = ['morning', 'afternoon', 'night', 'morning', 'afternoon'] as const;

  for (let dayOffset = -7; dayOffset <= 14; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0]!;

    for (let i = 0; i < users.length; i++) {
      const user = users[i]!;
      const shift = shifts[(i + Math.abs(dayOffset)) % shifts.length]!;

      const existing = await prisma.workSchedule.findFirst({
        where: {
          userId: user.id,
          scheduleDate: new Date(dateStr),
          houseId: house1.id,
        },
      });

      if (!existing) {
        await prisma.workSchedule.create({
          data: {
            houseId: house1.id,
            userId: user.id,
            scheduleDate: new Date(dateStr),
            shift,
            status: dayOffset < 0 ? 'present' : 'scheduled',
            notes: dayOffset === 0 ? 'Plantão de hoje' : undefined,
            createdBy: admin1.id,
          },
        });
      }
    }
  }

  // ─── Visitors ─────────────────────────────────────────────────────────────────

  const visitorData = [
    {
      id: '00000000-0000-0000-0000-200000000001',
      residentId: maria.id,
      name: 'João Silva',
      relationship: 'Filho',
      phone: '51999876543',
      daysAgo: 2,
    },
    {
      id: '00000000-0000-0000-0000-200000000002',
      residentId: jose.id,
      name: 'Ana Oliveira',
      relationship: 'Esposa',
      phone: '51998765432',
      daysAgo: 1,
    },
    {
      id: '00000000-0000-0000-0000-200000000003',
      residentId: fulano.id,
      name: 'Luciana Pereira',
      relationship: 'Filha',
      phone: '51997654321',
      daysAgo: 5,
    },
    {
      id: '00000000-0000-0000-0000-200000000004',
      residentId: maria.id,
      name: 'Carlos Silva',
      relationship: 'Neto',
      phone: '51988884444',
      daysAgo: 0,
    },
  ];

  for (const v of visitorData) {
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() - v.daysAgo);
    checkIn.setHours(14, 0, 0, 0);
    const checkOut = new Date(checkIn);
    checkOut.setHours(16, 30, 0, 0);

    await prisma.visitor.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        residentId: v.residentId,
        name: v.name,
        relationship: v.relationship,
        phone: v.phone,
        visitDate: new Date(checkIn.toISOString().split('T')[0]!),
        visitTimeIn: '14:00',
        visitTimeOut: v.daysAgo > 0 ? '16:30' : null,
      },
    });
  }

  console.log('✅ Seed concluído!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('  Casa 1: admin@quatro.com / senha123');
  console.log('  Enfermeira: enfermeira@quatro.com / senha123');
  console.log('  Cuidador: cuidador@quatro.com / senha123');
  console.log('  Casa 2: admin@cantinho.com / senha123');
  console.log('\n👴 Residentes criados:');
  console.log('  - Maria da Silva (CPF: 111.444.777-35)');
  console.log('  - José Oliveira (CPF: 222.333.444-05)');
  console.log('  - Francisco Pereira (CPF: 333.444.555-08)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
