'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField, SelectField, TextareaField } from '@/components/shared/FormField';
import type { CreateResidentInput } from '@/types/resident';

// Client-side CPF validation
function isValidCPF(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf[i - 1]!) * (11 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(cpf[9]!)) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf[i - 1]!) * (12 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(cpf[10]!);
}

const schema = z.object({
  // Pessoal
  name: z.string().min(3, 'Mínimo 3 caracteres').max(255),
  cpf: z
    .string()
    .length(11, 'CPF deve ter 11 dígitos')
    .regex(/^\d{11}$/, 'Apenas números')
    .refine(isValidCPF, 'CPF inválido'),
  rg: z.string().max(20).optional(),
  birthDate: z
    .string()
    .min(1, 'Data de nascimento obrigatória')
    .refine((d) => {
      const age = Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000));
      return age >= 60;
    }, 'Residente deve ter no mínimo 60 anos'),
  gender: z.enum(['M', 'F', 'O']),
  maritalStatus: z.enum(['single', 'married', 'widowed', 'divorced']).optional(),
  nationality: z.string().default('Brasileira'),

  // Contato
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido (10 ou 11 dígitos)').optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),

  // Endereço
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).regex(/^[A-Z]{2}$/).optional().or(z.literal('')),
  zipCode: z.string().optional(),

  // Emergência
  emergencyContactName: z.string().min(3, 'Nome obrigatório'),
  emergencyContactPhone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactEmail: z.string().email('Email inválido').optional().or(z.literal('')),

  // Saúde
  bloodType: z.enum(['O_pos', 'O_neg', 'A_pos', 'A_neg', 'B_pos', 'B_neg', 'AB_pos', 'AB_neg', 'unknown']).optional(),

  // Admissão
  admissionDate: z.string().min(1, 'Data de admissão obrigatória'),

  // Notas
  notes: z.string().optional(),
  specialNeeds: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: CreateResidentInput) => void | Promise<void>;
  isLoading?: boolean;
  isEdit?: boolean;
}

export function ResidentForm({ defaultValues, onSubmit, isLoading, isEdit = false }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: 'M',
      nationality: 'Brasileira',
      admissionDate: new Date().toISOString().split('T')[0],
      ...defaultValues,
    },
  });

  const handleFormSubmit = async (values: FormValues) => {
    const clean = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined),
    ) as unknown as CreateResidentInput;
    await onSubmit(clean);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* DADOS PESSOAIS */}
      <section>
        <h3 className="text-base font-semibold text-stone-900 dark:text-white mb-4 pb-2 border-b">
          Dados Pessoais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FormField
              label="Nome Completo"
              placeholder="Nome do residente"
              required
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
          <FormField
            label="CPF"
            placeholder="00000000000"
            maxLength={11}
            required
            disabled={isEdit}
            hint="Apenas números, sem pontos ou traços"
            error={errors.cpf?.message}
            {...register('cpf')}
          />
          <FormField
            label="RG"
            placeholder="0000000"
            error={errors.rg?.message}
            {...register('rg')}
          />
          <FormField
            label="Data de Nascimento"
            type="date"
            required
            error={errors.birthDate?.message}
            {...register('birthDate')}
          />
          <SelectField
            label="Sexo"
            required
            error={errors.gender?.message}
            {...register('gender')}
          >
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="O">Outro</option>
          </SelectField>
          <SelectField
            label="Estado Civil"
            {...register('maritalStatus')}
          >
            <option value="">Selecionar</option>
            <option value="single">Solteiro(a)</option>
            <option value="married">Casado(a)</option>
            <option value="widowed">Viúvo(a)</option>
            <option value="divorced">Divorciado(a)</option>
          </SelectField>
          <FormField
            label="Nacionalidade"
            placeholder="Brasileira"
            {...register('nationality')}
          />
        </div>
      </section>

      {/* CONTATO */}
      <section>
        <h3 className="text-base font-semibold text-stone-900 dark:text-white mb-4 pb-2 border-b">
          Contato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Telefone"
            placeholder="51987654321"
            hint="Apenas números (10 ou 11 dígitos)"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <FormField
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
      </section>

      {/* ENDEREÇO */}
      <section>
        <h3 className="text-base font-semibold text-stone-900 dark:text-white mb-4 pb-2 border-b">
          Endereço
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FormField
              label="Rua"
              placeholder="Rua das Flores"
              {...register('address')}
            />
          </div>
          <FormField
            label="Número"
            placeholder="123"
            {...register('addressNumber')}
          />
          <FormField
            label="Complemento"
            placeholder="Apto 45"
            {...register('addressComplement')}
          />
          <FormField
            label="Cidade"
            placeholder="Porto Alegre"
            {...register('city')}
          />
          <FormField
            label="Estado (UF)"
            placeholder="RS"
            maxLength={2}
            style={{ textTransform: 'uppercase' }}
            error={errors.state?.message}
            {...register('state')}
          />
          <FormField
            label="CEP"
            placeholder="90000-000"
            {...register('zipCode')}
          />
        </div>
      </section>

      {/* CONTATO DE EMERGÊNCIA */}
      <section>
        <h3 className="text-base font-semibold text-stone-900 dark:text-white mb-4 pb-2 border-b">
          Contato de Emergência
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Nome"
            placeholder="Nome do familiar/responsável"
            required
            error={errors.emergencyContactName?.message}
            {...register('emergencyContactName')}
          />
          <FormField
            label="Telefone"
            placeholder="51987654321"
            required
            error={errors.emergencyContactPhone?.message}
            {...register('emergencyContactPhone')}
          />
          <FormField
            label="Relação"
            placeholder="filho, neto, cônjuge..."
            {...register('emergencyContactRelationship')}
          />
          <FormField
            label="Email"
            type="email"
            placeholder="familiar@email.com"
            error={errors.emergencyContactEmail?.message}
            {...register('emergencyContactEmail')}
          />
        </div>
      </section>

      {/* SAÚDE + ADMISSÃO */}
      <section>
        <h3 className="text-base font-semibold text-stone-900 dark:text-white mb-4 pb-2 border-b">
          Saúde e Admissão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SelectField label="Tipo Sanguíneo" {...register('bloodType')}>
            <option value="">Selecionar</option>
            <option value="O_pos">O+</option>
            <option value="O_neg">O-</option>
            <option value="A_pos">A+</option>
            <option value="A_neg">A-</option>
            <option value="B_pos">B+</option>
            <option value="B_neg">B-</option>
            <option value="AB_pos">AB+</option>
            <option value="AB_neg">AB-</option>
            <option value="unknown">Desconhecido</option>
          </SelectField>
          <FormField
            label="Data de Admissão"
            type="date"
            required
            error={errors.admissionDate?.message}
            {...register('admissionDate')}
          />
        </div>
      </section>

      {/* NOTAS */}
      <section>
        <h3 className="text-base font-semibold text-stone-900 dark:text-white mb-4 pb-2 border-b">
          Observações
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextareaField
            label="Notas Gerais"
            placeholder="Preferências, hobbies, comportamento..."
            {...register('notes')}
          />
          <TextareaField
            label="Necessidades Especiais"
            placeholder="Restrições de mobilidade, audição, visão..."
            {...register('specialNeeds')}
          />
        </div>
      </section>

      {/* ACTIONS */}
      <div className="flex gap-3 pt-4 border-t">
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Residente'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => window.history.back()}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
