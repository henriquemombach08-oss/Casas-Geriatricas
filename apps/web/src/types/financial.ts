export type FinancialType = 'charge' | 'payment' | 'refund' | 'adjustment' | 'fine';
export type FinancialCategory = 'monthly_fee' | 'medicine' | 'supplies' | 'extra_service' | 'other';
export type FinancialStatus = 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'canceled' | 'disputed';
export type PaymentMethod = 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'other';

export interface FinancialRecord {
  id: string;
  residentId: string;
  houseId: string;
  type: FinancialType;
  amount: number;
  originalAmount?: number;
  description: string;
  category: FinancialCategory;
  issueDate: string;
  dueDate?: string;
  paidDate?: string;
  paymentMethod?: PaymentMethod;
  bankAccount?: string;
  checkNumber?: string;
  status: FinancialStatus;
  nfeNumber?: string;
  nfeIssuedAt?: string;
  invoiceNumber?: string;
  referenceMonth?: string;
  notes?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
  days_overdue?: number;
}

export interface FinancialSummary {
  month: string;
  residents_with_charges: number;
  pending_amount: number;
  overdue_amount: number;
  received_this_month: number;
  monthly_revenue: number;
  payment_rate: number;
  top_debtors: TopDebtor[];
  cash_flow: {
    this_month: number;
    last_month: number;
    trend: 'up' | 'down';
  };
}

export interface TopDebtor {
  resident_name: string;
  amount_overdue: number;
  days_overdue: number;
}

export interface ResidentFinancialHistory {
  resident: { id: string; name: string; cpf: string };
  records: FinancialRecord[];
  summary: {
    total_charges: number;
    total_paid: number;
    total_pending: number;
    total_overdue: number;
    payment_rate: number;
  };
}

export interface CreateFinancialInput {
  resident_id: string;
  type: FinancialType;
  amount: number;
  description: string;
  category?: FinancialCategory;
  issue_date: string;
  due_date?: string;
  paid_date?: string;
  payment_method?: PaymentMethod;
  bank_account?: string;
  reference_month?: string;
  notes?: string;
}

export const TYPE_LABELS: Record<FinancialType, string> = {
  charge:     'Cobrança',
  payment:    'Pagamento',
  refund:     'Devolução',
  adjustment: 'Ajuste',
  fine:       'Multa',
};

export const CATEGORY_LABELS: Record<FinancialCategory, string> = {
  monthly_fee:   'Mensalidade',
  medicine:      'Medicamentos',
  supplies:      'Materiais',
  extra_service: 'Serviço Extra',
  other:         'Outros',
};

export const STATUS_LABELS: Record<FinancialStatus, string> = {
  pending:         'Pendente',
  paid:            'Pago',
  overdue:         'Atrasado',
  partially_paid:  'Parcialmente Pago',
  canceled:        'Cancelado',
  disputed:        'Em Disputa',
};

export const STATUS_COLORS: Record<FinancialStatus, string> = {
  pending:         'bg-yellow-100 text-yellow-800',
  paid:            'bg-green-100 text-green-800',
  overdue:         'bg-red-100 text-red-800',
  partially_paid:  'bg-orange-100 text-orange-800',
  canceled:        'bg-gray-100 text-gray-500',
  disputed:        'bg-purple-100 text-purple-800',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:           'Dinheiro',
  check:          'Cheque',
  bank_transfer:  'Transferência',
  credit_card:    'Cartão de Crédito',
  debit_card:     'Cartão de Débito',
  pix:            'PIX',
  boleto:         'Boleto',
  other:          'Outro',
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
