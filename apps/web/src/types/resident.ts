export type ResidentStatus = 'active' | 'inactive' | 'discharged';
export type ResidentGender = 'M' | 'F' | 'O';
export type MaritalStatus = 'single' | 'married' | 'widowed' | 'divorced';
export type BloodType = 'O_pos' | 'O_neg' | 'A_pos' | 'A_neg' | 'B_pos' | 'B_neg' | 'AB_pos' | 'AB_neg' | 'unknown';
export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired';
export type DocumentType = 'rg' | 'cpf' | 'driver_license' | 'passport' | 'medical_report' | 'insurance' | 'income_statement' | 'other';

export interface Allergy {
  id?: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction?: string;
  addedDate?: string;
}

export interface Surgery {
  id?: string;
  name: string;
  date?: string;
  hospital?: string;
  surgeon?: string;
  complications?: string;
  notes?: string;
}

export interface Condition {
  id?: string;
  name: string;
  diagnosedDate?: string;
  status: 'active' | 'controlled' | 'resolved';
  treatment?: string;
  notes?: string;
}

export interface MedicalHistory {
  allergies?: Allergy[];
  surgeries?: Surgery[];
  conditions?: Condition[];
  lastCheckup?: {
    date: string;
    doctor?: string;
    clinic?: string;
    findings?: string;
  };
}

export interface ResidentDocument {
  id: string;
  type: DocumentType;
  name?: string;
  description?: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
  issueDate?: string;
  expiresAt?: string;
  isExpired: boolean;
  status: DocumentStatus;
  uploadedAt: string;
  uploader?: { id: string; name: string };
  notes?: string;
}

export interface ResidentSummary {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  age: number;
  gender: ResidentGender;
  status: ResidentStatus;
  admissionDate: string;
  emergencyContactName: string;
  phone?: string;
  photoUrl?: string;
  bloodType?: BloodType;
  hasExpiredDocuments: boolean;
  documentCount: number;
}

export interface Resident extends ResidentSummary {
  rg?: string;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  email?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string;
  emergencyContactEmail?: string;
  photoUpdatedAt?: string;
  dischargeDate?: string;
  reasonIfInactive?: string;
  medicalHistory?: MedicalHistory;
  documents: ResidentDocument[];
  notes?: string;
  specialNeeds?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResidentInput {
  name: string;
  cpf: string;
  rg?: string;
  birthDate: string;
  gender: ResidentGender;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  phone?: string;
  email?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string;
  emergencyContactEmail?: string;
  bloodType?: BloodType;
  admissionDate: string;
  medicalHistory?: MedicalHistory;
  notes?: string;
  specialNeeds?: string;
}

export type UpdateResidentInput = Partial<Omit<CreateResidentInput, 'cpf'>>;

export interface ResidentListResponse {
  residents: ResidentSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ResidentFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ResidentStatus;
  sortBy?: 'name' | 'admissionDate' | 'birthDate';
  sortOrder?: 'asc' | 'desc';
}
