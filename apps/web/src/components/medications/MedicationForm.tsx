'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField, TextareaField } from '@/components/shared/FormField';
import TimeInput from '@/components/shared/TimeInput';
import type { CreateMedicationInput, UpdateMedicationInput } from '@/types/medication';

const timePattern = /^\d{2}:\d{2}$/;

const schema = z
  .object({
    residentId: z.string().uuid().optional(),
    name: z.string().min(1, 'Nome é obrigatório'),
    activeIngredient: z.string().optional(),
    dosage: z.string().optional(),
    measurementUnit: z.enum(['mg', 'ml', 'comp', 'gotas', 'mcg', 'g', 'ui', 'other', '']).optional(),
    frequencyDescription: z.string().min(1, 'Descrição da frequência é obrigatória'),
    timesPerDay: z.number({ invalid_type_error: 'Informe quantas vezes por dia' }).int().min(1).max(24),
    scheduledTimes: z
      .array(z.string().regex(timePattern, 'Horário deve ser HH:MM'))
      .min(1, 'Ao menos um horário'),
    startDate: z.string().min(1, 'Data de início é obrigatória'),
    endDate: z.string().optional(),
    prescriptionDate: z.string().optional(),
    prescriberName: z.string().optional(),
    prescriberCrm: z.string().optional(),
    prescriberPhone: z.string().optional(),
    prescriberEmail: z.string().email('Email inválido').optional().or(z.literal('')),
    sideEffects: z.string().optional(),
    contraindications: z.string().optional(),
    interactionWarnings: z.string().optional(),
    specialInstructions: z.string().optional(),
    instructionsForCaregiver: z.string().optional(),
    notes: z.string().optional(),
    // Only required on edit
    reasonForChange: z.string().optional(),
  })
  .refine(
    (d) => d.scheduledTimes.length === d.timesPerDay,
    {
      message: 'Número de horários deve ser igual à frequência diária',
      path: ['scheduledTimes'],
    },
  )
  .refine(
    (d) => {
      const unique = new Set(d.scheduledTimes);
      return unique.size === d.scheduledTimes.length;
    },
    { message: 'Horários duplicados não são permitidos', path: ['scheduledTimes'] },
  );

type FormValues = z.infer<typeof schema>;

interface Props {
  residentId?: string;
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: CreateMedicationInput | UpdateMedicationInput) => void;
  isLoading: boolean;
  isEdit?: boolean;
}

export default function MedicationForm({
  residentId,
  defaultValues,
  onSubmit,
  isLoading,
  isEdit = false,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      residentId,
      scheduledTimes: [''],
      timesPerDay: 1,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'scheduledTimes' as never,
  });

  const timesPerDay = watch('timesPerDay');

  const handleFormSubmit = (values: FormValues) => {
    const { residentId: rid, reasonForChange, measurementUnit, prescriberEmail, ...rest } = values;
    const payload = {
      ...rest,
      ...(rid ? { residentId: rid } : {}),
      measurementUnit: measurementUnit || undefined,
      prescriberEmail: prescriberEmail || undefined,
      endDate: rest.endDate || undefined,
      prescriptionDate: rest.prescriptionDate || undefined,
      prescriberName: rest.prescriberName || undefined,
      prescriberCrm: rest.prescriberCrm || undefined,
      prescriberPhone: rest.prescriberPhone || undefined,
      ...(isEdit ? { reasonForChange: reasonForChange ?? '' } : {}),
    };
    onSubmit(payload as CreateMedicationInput | UpdateMedicationInput);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Medicamento */}
      <fieldset>
        <legend className="text-base font-bold text-gray-900 mb-4 pb-2 border-b">
          Medicamento
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Nome *"
            placeholder="Ex: Losartana"
            {...register('name')}
            error={errors.name?.message}
          />
          <FormField
            label="Ingrediente ativo"
            placeholder="Ex: Losartana Potássica"
            {...register('activeIngredient')}
          />
          <FormField
            label="Dosagem"
            placeholder="Ex: 50"
            {...register('dosage')}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Unidade</label>
            <select
              {...register('measurementUnit')}
              className="input text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            >
              <option value="">Selecione...</option>
              <option value="mg">mg</option>
              <option value="ml">ml</option>
              <option value="comp">Comprimido</option>
              <option value="gotas">Gotas</option>
              <option value="mcg">mcg</option>
              <option value="g">g</option>
              <option value="ui">UI (Unidades Internacionais)</option>
              <option value="other">Outro</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* Frequência */}
      <fieldset>
        <legend className="text-base font-bold text-gray-900 mb-4 pb-2 border-b">
          Frequência e horários
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField
            label="Descrição *"
            placeholder="Ex: 2x ao dia, a cada 8 horas"
            {...register('frequencyDescription')}
            error={errors.frequencyDescription?.message}
          />
          <FormField
            label="Vezes por dia *"
            type="number"
            min={1}
            max={24}
            {...register('timesPerDay', { valueAsNumber: true })}
            error={errors.timesPerDay?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Horários * ({fields.length} de {timesPerDay || 0})
          </label>
          <div className="space-y-2 mb-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <TimeInput
                  {...register(`scheduledTimes.${index}`)}
                  error={errors.scheduledTimes?.[index]?.message}
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm transition"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
          {(errors.scheduledTimes as unknown as { message?: string })?.message && (
            <p className="text-xs text-red-600 mb-2">
              {(errors.scheduledTimes as unknown as { message?: string }).message}
            </p>
          )}
          <button
            type="button"
            onClick={() => append('' as never)}
            className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition"
          >
            + Adicionar horário
          </button>
        </div>
      </fieldset>

      {/* Período */}
      <fieldset>
        <legend className="text-base font-bold text-gray-900 mb-4 pb-2 border-b">
          Período
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            label="Data de início *"
            type="date"
            {...register('startDate')}
            error={errors.startDate?.message}
          />
          <FormField
            label="Data de término (opcional)"
            type="date"
            {...register('endDate')}
          />
          <FormField
            label="Data da prescrição"
            type="date"
            {...register('prescriptionDate')}
          />
        </div>
      </fieldset>

      {/* Prescritor */}
      <fieldset>
        <legend className="text-base font-bold text-gray-900 mb-4 pb-2 border-b">
          Prescritor
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Nome do médico"
            {...register('prescriberName')}
          />
          <FormField
            label="CRM"
            placeholder="123456/SP"
            {...register('prescriberCrm')}
          />
          <FormField
            label="Telefone"
            type="tel"
            placeholder="51999990000"
            {...register('prescriberPhone')}
          />
          <FormField
            label="Email"
            type="email"
            {...register('prescriberEmail')}
            error={errors.prescriberEmail?.message}
          />
        </div>
      </fieldset>

      {/* Avisos e instruções */}
      <fieldset>
        <legend className="text-base font-bold text-gray-900 mb-4 pb-2 border-b">
          Avisos e instruções
        </legend>
        <div className="space-y-4">
          <TextareaField
            label="Efeitos colaterais"
            rows={2}
            {...register('sideEffects')}
            placeholder="Ex: Tontura, hipotensão postural..."
          />
          <TextareaField
            label="Contra-indicações"
            rows={2}
            {...register('contraindications')}
          />
          <TextareaField
            label="Avisos de interação medicamentosa"
            rows={2}
            {...register('interactionWarnings')}
            placeholder="Ex: Não usar com ACE inibidores, evitar com AINES..."
          />
          <TextareaField
            label="Instruções especiais"
            rows={2}
            {...register('specialInstructions')}
            placeholder="Ex: Tomar com alimento, não tomar com leite..."
          />
          <TextareaField
            label="Instruções para o cuidador"
            rows={2}
            {...register('instructionsForCaregiver')}
            placeholder="Ex: Monitorar pressão arterial após administração..."
          />
          <TextareaField
            label="Observações gerais"
            rows={2}
            {...register('notes')}
          />
        </div>
      </fieldset>

      {/* Motivo da alteração (somente no edit) */}
      {isEdit && (
        <fieldset>
          <legend className="text-base font-bold text-gray-900 mb-4 pb-2 border-b">
            Alteração
          </legend>
          <TextareaField
            label="Motivo da alteração *"
            rows={2}
            {...register('reasonForChange')}
            error={errors.reasonForChange?.message}
            placeholder="Ex: Ajuste de dose por determinação médica..."
          />
        </fieldset>
      )}

      <div className="flex gap-4 pt-4 border-t">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {isLoading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar prescrição'}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
