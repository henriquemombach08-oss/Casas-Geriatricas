export type WorkShift = 'morning' | 'afternoon' | 'night' | 'full_day' | 'on_call';
export type ScheduleStatus = 'scheduled' | 'confirmed' | 'no_show' | 'present' | 'excused_absence';

export interface ScheduleUser {
  id: string;
  name: string;
  role: string;
  phone?: string;
}

export interface WorkSchedule {
  id: string;
  userId: string;
  houseId: string;
  scheduleDate: string;
  shift: WorkShift;
  startTime?: string;
  endTime?: string;
  confirmedByUser: boolean;
  confirmedAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  status: ScheduleStatus;
  notes?: string;
  absenceReason?: string;
  absenceApproved: boolean;
  createdAt: string;
  updatedAt: string;
  user?: ScheduleUser;
  is_late?: boolean;
  worked_hours?: number | null;
}

export interface ScheduleSummary {
  total_scheduled: number;
  total_confirmed: number;
  total_no_show: number;
  total_present: number;
}

export interface SchedulesResponse {
  month: string | null;
  schedules: WorkSchedule[];
  summary: ScheduleSummary;
}

export interface CreateScheduleEntry {
  user_id: string;
  schedule_date: string;
  shift: WorkShift;
  start_time?: string;
  end_time?: string;
  notes?: string;
}

export const SHIFT_LABELS: Record<WorkShift, string> = {
  morning:   'Manhã (07h–13h)',
  afternoon: 'Tarde (13h–19h)',
  night:     'Noite (19h–07h)',
  full_day:  'Dia Inteiro (07h–19h)',
  on_call:   'Sobreaviso',
};

export const STATUS_LABELS: Record<ScheduleStatus, string> = {
  scheduled:        'Aguardando confirmação',
  confirmed:        'Confirmado',
  no_show:          'Faltou',
  present:          'Presente',
  excused_absence:  'Ausência justificada',
};

export const STATUS_COLORS: Record<ScheduleStatus, string> = {
  scheduled:        'bg-yellow-100 text-yellow-800',
  confirmed:        'bg-green-100 text-green-800',
  no_show:          'bg-red-100 text-red-800',
  present:          'bg-blue-100 text-blue-800',
  excused_absence:  'bg-gray-100 text-gray-800',
};
