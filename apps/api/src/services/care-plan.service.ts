// ─── Types ────────────────────────────────────────────────────────────────────

// Mirrors Prisma enum CarePlanTaskCategory
export type CarePlanTaskCategory =
  | 'medication'
  | 'monitoring'
  | 'therapy'
  | 'nutrition'
  | 'mobility'
  | 'hygiene'
  | 'social'
  | 'other';

interface TaskTemplate {
  title: string;
  category: CarePlanTaskCategory;
  frequency: string;
  description?: string;
}

interface CarePlanTemplate {
  tasks: TaskTemplate[];
}

// ─── Templates ────────────────────────────────────────────────────────────────

const CARE_PLAN_TEMPLATES: Record<string, CarePlanTemplate> = {
  'hipertensão': {
    tasks: [
      {
        title: 'Monitorar pressão arterial 2x/dia',
        category: 'monitoring',
        frequency: '2x ao dia',
        description: 'Aferir PA de manhã e à tarde, registrar valores e reportar alterações',
      },
      {
        title: 'Medir glicemia',
        category: 'monitoring',
        frequency: 'Diário',
        description: 'Glicemia capilar em jejum e pós-prandial conforme prescrição',
      },
      {
        title: 'Dieta hipossódica',
        category: 'nutrition',
        frequency: 'Diário',
        description: 'Controle rigoroso do consumo de sódio, evitar alimentos processados e sal extra',
      },
    ],
  },
  'pressão alta': {
    tasks: [
      {
        title: 'Monitorar pressão arterial 2x/dia',
        category: 'monitoring',
        frequency: '2x ao dia',
        description: 'Aferir PA de manhã e à tarde, registrar valores e reportar alterações',
      },
      {
        title: 'Dieta hipossódica',
        category: 'nutrition',
        frequency: 'Diário',
        description: 'Controle rigoroso do consumo de sódio',
      },
    ],
  },
  'diabetes': {
    tasks: [
      {
        title: 'Glicemia capilar em jejum',
        category: 'monitoring',
        frequency: 'Diário',
        description: 'Aferir glicemia antes do café da manhã',
      },
      {
        title: 'Controle alimentar — dieta para diabetes',
        category: 'nutrition',
        frequency: 'Diário',
        description: 'Fracionar refeições, controlar carboidratos, evitar açúcares simples',
      },
      {
        title: 'Cuidado com os pés',
        category: 'hygiene',
        frequency: 'Diário',
        description: 'Inspecionar pés diariamente para lesões, feridas ou alterações de cor/temperatura',
      },
    ],
  },
  'demência': {
    tasks: [
      {
        title: 'Orientação para a realidade',
        category: 'therapy',
        frequency: 'Diário',
        description: 'Informar data, local, nome e eventos recentes ao paciente',
      },
      {
        title: 'Estimulação cognitiva',
        category: 'therapy',
        frequency: 'Diário',
        description: 'Atividades de memória, jogos, leitura ou música conforme capacidade',
      },
      {
        title: 'Supervisão na deambulação',
        category: 'mobility',
        frequency: 'Diário',
        description: 'Acompanhar e supervisionar deslocamentos para prevenção de quedas',
      },
    ],
  },
  'alzheimer': {
    tasks: [
      {
        title: 'Orientação para a realidade',
        category: 'therapy',
        frequency: 'Diário',
        description: 'Informar data, local e eventos recentes ao paciente',
      },
      {
        title: 'Estimulação cognitiva',
        category: 'therapy',
        frequency: 'Diário',
        description: 'Atividades adaptadas à fase da doença',
      },
      {
        title: 'Supervisão na deambulação e prevenção de fuga',
        category: 'mobility',
        frequency: 'Diário',
        description: 'Supervisão contínua para segurança e prevenção de acidentes',
      },
    ],
  },
  'parkinson': {
    tasks: [
      {
        title: 'Fisioterapia motora',
        category: 'therapy',
        frequency: '3x por semana',
        description: 'Exercícios de mobilidade, equilíbrio e coordenação motora',
      },
      {
        title: 'Fonoaudiologia',
        category: 'therapy',
        frequency: '2x por semana',
        description: 'Exercícios de deglutição e fala',
      },
      {
        title: 'Prevenção de quedas',
        category: 'mobility',
        frequency: 'Diário',
        description: 'Ambiente adaptado, uso de andador/bengala, supervisão em deslocamentos',
      },
    ],
  },
  'osteoporose': {
    tasks: [
      {
        title: 'Exercícios de força muscular',
        category: 'mobility',
        frequency: '3x por semana',
        description: 'Exercícios de resistência adaptados para fortalecer musculatura',
      },
      {
        title: 'Suplementação de cálcio e vitamina D',
        category: 'medication',
        frequency: 'Diário',
        description: 'Administrar suplemento conforme prescrição médica',
      },
      {
        title: 'Prevenção de quedas',
        category: 'mobility',
        frequency: 'Diário',
        description: 'Ambiente seguro, tapetes antiderrapantes, iluminação adequada',
      },
    ],
  },
  'fratura': {
    tasks: [
      {
        title: 'Fisioterapia de reabilitação',
        category: 'therapy',
        frequency: 'Conforme indicação',
        description: 'Exercícios de reabilitação pós-fratura',
      },
      {
        title: 'Prevenção de quedas',
        category: 'mobility',
        frequency: 'Diário',
        description: 'Supervisão em deslocamentos, uso de dispositivos de apoio',
      },
      {
        title: 'Suplementação de cálcio',
        category: 'medication',
        frequency: 'Diário',
        description: 'Suplemento conforme prescrição para recuperação óssea',
      },
    ],
  },
  'depressão': {
    tasks: [
      {
        title: 'Avaliação do humor diária',
        category: 'monitoring',
        frequency: 'Diário',
        description: 'Registrar humor, apetite, sono e comportamento; reportar alterações significativas',
      },
      {
        title: 'Atividades sociais e recreativas',
        category: 'social',
        frequency: 'Diário',
        description: 'Estimular participação em atividades em grupo e interação social',
      },
      {
        title: 'Acompanhamento psicológico',
        category: 'therapy',
        frequency: 'Semanal',
        description: 'Sessões com psicólogo conforme agendamento',
      },
    ],
  },
  'ansiedade': {
    tasks: [
      {
        title: 'Avaliação do humor e nível de ansiedade',
        category: 'monitoring',
        frequency: 'Diário',
        description: 'Registrar sinais de ansiedade, agitação ou insônia',
      },
      {
        title: 'Atividades sociais e de relaxamento',
        category: 'social',
        frequency: 'Diário',
        description: 'Atividades calmantes: música, leitura, contato social moderado',
      },
      {
        title: 'Acompanhamento psicológico',
        category: 'therapy',
        frequency: 'Semanal',
        description: 'Sessões com psicólogo',
      },
    ],
  },
  'doença renal': {
    tasks: [
      {
        title: 'Controle hídrico',
        category: 'monitoring',
        frequency: 'Diário',
        description: 'Registrar ingesta e diurese, monitorar edemas',
      },
      {
        title: 'Dieta renal',
        category: 'nutrition',
        frequency: 'Diário',
        description: 'Restrição de potássio, fósforo e proteínas conforme prescrição nutricional',
      },
      {
        title: 'Monitorar edemas',
        category: 'monitoring',
        frequency: 'Diário',
        description: 'Avaliar presença e grau de edemas em membros inferiores',
      },
    ],
  },
  'insuficiência renal': {
    tasks: [
      {
        title: 'Controle hídrico rigoroso',
        category: 'monitoring',
        frequency: 'Diário',
        description: 'Registrar ingesta e diurese; alertar equipe se diurese < 500ml/dia',
      },
      {
        title: 'Dieta renal',
        category: 'nutrition',
        frequency: 'Diário',
        description: 'Restrição dietética conforme estágio da doença renal',
      },
      {
        title: 'Monitorar edemas e peso',
        category: 'monitoring',
        frequency: 'Diário',
        description: 'Pesagem diária e avaliação de edemas',
      },
    ],
  },
  'acidente vascular': {
    tasks: [
      {
        title: 'Fisioterapia motora e de reabilitação',
        category: 'therapy',
        frequency: 'Diário',
        description: 'Exercícios de reabilitação funcional pós-AVC',
      },
      {
        title: 'Fonoaudiologia — disfagia',
        category: 'therapy',
        frequency: '3x por semana',
        description: 'Avaliação e exercícios para segurança na deglutição',
      },
      {
        title: 'Cuidado com a pele e prevenção de escaras',
        category: 'hygiene',
        frequency: 'Diário',
        description: 'Mudança de decúbito a cada 2h em pacientes acamados, inspeção diária da pele',
      },
    ],
  },
  'avc': {
    tasks: [
      {
        title: 'Fisioterapia motora e de reabilitação',
        category: 'therapy',
        frequency: 'Diário',
        description: 'Exercícios de reabilitação funcional pós-AVC',
      },
      {
        title: 'Fonoaudiologia — disfagia',
        category: 'therapy',
        frequency: '3x por semana',
        description: 'Exercícios para segurança na deglutição',
      },
      {
        title: 'Cuidado com a pele',
        category: 'hygiene',
        frequency: 'Diário',
        description: 'Mudança de decúbito e inspeção diária da pele',
      },
    ],
  },
  'default': {
    tasks: [
      {
        title: 'Banho diário',
        category: 'hygiene',
        frequency: 'Diário',
        description: 'Banho assistido ou supervisionado conforme necessidade',
      },
      {
        title: 'Curativo (se necessário)',
        category: 'hygiene',
        frequency: 'Conforme necessidade',
        description: 'Troca de curativo em feridas abertas ou lesões de pele',
      },
      {
        title: 'Higiene bucal',
        category: 'hygiene',
        frequency: 'Diário',
        description: 'Higienização da boca após refeições',
      },
      {
        title: 'Avaliação nutricional',
        category: 'nutrition',
        frequency: 'Semanal',
        description: 'Pesagem e avaliação da aceitação alimentar',
      },
    ],
  },
};

const ADVANCED_AGE_TASKS: TaskTemplate[] = [
  {
    title: 'Monitorar sinais vitais',
    category: 'monitoring',
    frequency: 'Diário',
    description: 'Aferir PA, temperatura, FC e frequência respiratória',
  },
  {
    title: 'Prevenção de quedas — protocolo reforçado',
    category: 'mobility',
    frequency: 'Diário',
    description: 'Ambiente seguro, grades de cama, acompanhamento em todos os deslocamentos',
  },
];

// ─── generateCarePlanFromDiagnoses ────────────────────────────────────────────

export function generateCarePlanFromDiagnoses(
  diagnoses: string[],
  residentAge: number,
): {
  title: string;
  tasks: TaskTemplate[];
} {
  const matchedTasks: TaskTemplate[] = [];
  const seenTitles = new Set<string>();
  const matchedConditions: string[] = [];

  const diagnosesLower = diagnoses.map((d) => d.toLowerCase());

  for (const [keyword, template] of Object.entries(CARE_PLAN_TEMPLATES)) {
    if (keyword === 'default') continue;

    const matched = diagnosesLower.some((d) => d.includes(keyword));
    if (matched) {
      matchedConditions.push(keyword);
      for (const task of template.tasks) {
        if (!seenTitles.has(task.title)) {
          seenTitles.add(task.title);
          matchedTasks.push(task);
        }
      }
    }
  }

  // Always add default tasks (deduplicated)
  const defaultTemplate = CARE_PLAN_TEMPLATES['default'];
  if (defaultTemplate) {
    for (const task of defaultTemplate.tasks) {
      if (!seenTitles.has(task.title)) {
        seenTitles.add(task.title);
        matchedTasks.push(task);
      }
    }
  }

  // Extra monitoring for advanced age
  if (residentAge > 80) {
    for (const task of ADVANCED_AGE_TASKS) {
      if (!seenTitles.has(task.title)) {
        seenTitles.add(task.title);
        matchedTasks.push(task);
      }
    }
  }

  const conditionsSummary =
    matchedConditions.length > 0
      ? matchedConditions
          .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
          .join(', ')
      : 'Cuidados Gerais';

  const title = `Plano de Cuidados — ${conditionsSummary}`;

  return { title, tasks: matchedTasks };
}
