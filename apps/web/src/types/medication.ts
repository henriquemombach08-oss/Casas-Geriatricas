export type MeasurementUnit = 'mg' | 'ml' | 'comp' | 'gotas' | 'mcg' | 'g' | 'ui' | 'other';
export type MedicationStatus = 'active' | 'inactive';
export type MedicationLogStatus =
  | 'administered'
  | 'refused'
  | 'missed'
  | 'delayed'
  | 'partially_administered'
  | 'not_available';

export interface Medication {
  id: string;
  residentId: string;
  name: string;
  activeIngredient?: string;
  dosage?: string;
  measurementUnit?: MeasurementUnit;
  frequency?: string;
  frequencyDescription?: string;
  timesPerDay?: number;
  scheduledTimes: string[];
  startDate: string;
  endDate?: string;
  prescriptionDate?: string;
  prescriberName?: string;
  prescriberCrm?: string;
  prescriberPhone?: string;
  prescriberEmail?: string;
  pharmacyCode?: string;
  pharmacyName?: string;
  pharmacyBatchNumber?: string;
  pharmacyExpiration?: string;
  pharmacyCnpj?: string;
  sideEffects?: string;
  contraindications?: string;
  interactionWarnings?: string;
  specialInstructions?: string;
  instructionsForCaregiver?: string;
  status: MedicationStatus;
  reasonIfInactive?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  residentId: string;
  administeredBy: string;
  scheduledTime?: string;
  administeredAt?: string;
  status: MedicationLogStatus;
  dosageActuallyGiven?: string;
  reasonIfNotGiven?: string;
  residentComplaint?: string;
  notes?: string;
  createdAt: string;
  administratedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface MedicationScheduleItem {
  id: string;
  medication_id: string;
  resident_id: string;
  resident_name: string;
  resident_photo: string | null;
  medication_name: string;
  dosage: string | null;
  measurement_unit: string | null;
  scheduled_time: string;
  minutes_until: number;
  special_instructions: string | null;
  instructions_for_caregiver: string | null;
  interaction_warnings: string | null;
  is_overdue: boolean;
  already_administered: boolean;
}

export interface MedicationScheduleResponse {
  date: string;
  next_medications: MedicationScheduleItem[];
  total: number;
  urgent_count: number;
}

export interface MedicationHistoryStats {
  total_logs: number;
  adherence_rate: number;
  period_days: number;
  status_counts: Partial<Record<MedicationLogStatus, number>>;
}

export interface MedicationHistory {
  medication: Medication;
  logs: MedicationLog[];
  stats: MedicationHistoryStats;
}

export interface CreateMedicationInput {
  residentId: string;
  name: string;
  activeIngredient?: string;
  dosage?: string;
  measurementUnit?: MeasurementUnit;
  frequency?: string;
  frequencyDescription: string;
  timesPerDay: number;
  scheduledTimes: string[];
  startDate: string;
  endDate?: string;
  prescriptionDate?: string;
  prescriberName?: string;
  prescriberCrm?: string;
  prescriberPhone?: string;
  prescriberEmail?: string;
  pharmacyCode?: string;
  pharmacyName?: string;
  pharmacyBatchNumber?: string;
  pharmacyExpiration?: string;
  pharmacyCnpj?: string;
  sideEffects?: string;
  contraindications?: string;
  interactionWarnings?: string;
  specialInstructions?: string;
  instructionsForCaregiver?: string;
  notes?: string;
}

export interface UpdateMedicationInput extends Partial<Omit<CreateMedicationInput, 'residentId'>> {
  reasonForChange: string;
}

export interface RegisterLogInput {
  scheduledTime?: string;
  status: MedicationLogStatus;
  administeredAt?: string;
  dosageActuallyGiven?: string;
  reasonIfNotGiven?: string;
  residentComplaint?: string;
  notes?: string;
}
