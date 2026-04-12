// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'director' | 'nurse' | 'caregiver' | 'admin_finance';

export type ResidentStatus = 'active' | 'inactive' | 'discharged';

export type ResidentGender = 'M' | 'F' | 'O';

export type DocumentType = 'rg' | 'cpf' | 'income_statement' | 'other';

export type MedicationLogStatus = 'administered' | 'refused' | 'missed' | 'delayed';

export type WorkShift = 'morning' | 'afternoon' | 'night' | 'full_day';

export type FinancialType = 'charge' | 'payment' | 'refund' | 'adjustment';

export type FinancialStatus = 'pending' | 'paid' | 'overdue' | 'canceled';

export type PaymentMethod = 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'other';

export type NotificationChannel = 'in_app' | 'sms' | 'whatsapp' | 'email';

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface House {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  houseId: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalHistory {
  allergies: string[];
  surgeries: string[];
  conditions: string[];
  currentMedications?: string[];
  lastConsultation?: string;
  notes?: string;
}

export interface Resident {
  id: string;
  houseId: string;
  name: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  gender: ResidentGender;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  medicalHistory?: MedicalHistory;
  photoUrl?: string;
  admissionDate?: string;
  status: ResidentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  residentId: string;
  type: DocumentType;
  fileUrl: string;
  expiresAt?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  residentId: string;
  name: string;
  dosage?: string;
  frequency?: string;
  timesPerDay?: number;
  scheduledTimes: string[]; // ['08:00', '16:00']
  startDate: string;
  endDate?: string;
  prescriberName?: string;
  prescriberCrm?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  residentId: string;
  administeredBy: string;
  administeredAt: string;
  status: MedicationLogStatus;
  reasonIfNotGiven?: string;
  notes?: string;
  createdAt: string;
  // Relations
  medication?: Medication;
  resident?: Resident;
  administeredByUser?: User;
}

export interface WorkSchedule {
  id: string;
  userId: string;
  houseId: string;
  date: string;
  shift: WorkShift;
  startTime?: string;
  endTime?: string;
  confirmed: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: User;
}

export interface Visitor {
  id: string;
  residentId: string;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  visitDate: string;
  visitTimeIn?: string;
  visitTimeOut?: string;
  notes?: string;
  createdAt: string;
  // Relations
  resident?: Resident;
}

export interface FinancialRecord {
  id: string;
  residentId: string;
  houseId: string;
  type: FinancialType;
  amount: number;
  description?: string;
  dueDate?: string;
  paidDate?: string;
  paymentMethod?: PaymentMethod;
  invoiceNumber?: string;
  nfeNumber?: string;
  status: FinancialStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  resident?: Resident;
}

export interface AuditLog {
  id: string;
  houseId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  houseId: string;
  title: string;
  body: string;
  type: string;
  channel: NotificationChannel;
  read: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface AuthContext {
  user: User;
  house: House;
}
