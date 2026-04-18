-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'director', 'nurse', 'caregiver', 'admin_finance', 'cook', 'other');

-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('active', 'inactive', 'discharged');

-- CreateEnum
CREATE TYPE "ResidentGender" AS ENUM ('M', 'F', 'O');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('rg', 'cpf', 'driver_license', 'passport', 'medical_report', 'insurance', 'income_statement', 'other');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('valid', 'expiring_soon', 'expired');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('single', 'married', 'widowed', 'divorced');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'unknown');

-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('mg', 'ml', 'comp', 'gotas', 'mcg', 'g', 'ui', 'other');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "MedicationLogStatus" AS ENUM ('administered', 'refused', 'missed', 'delayed', 'partially_administered', 'not_available');

-- CreateEnum
CREATE TYPE "WorkShift" AS ENUM ('morning', 'afternoon', 'night', 'full_day', 'on_call');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('scheduled', 'confirmed', 'no_show', 'present', 'excused_absence');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('active', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "CarePlanTaskCategory" AS ENUM ('medication', 'monitoring', 'therapy', 'nutrition', 'mobility', 'hygiene', 'social', 'other');

-- CreateEnum
CREATE TYPE "FinancialType" AS ENUM ('charge', 'payment', 'refund', 'adjustment', 'fine');

-- CreateEnum
CREATE TYPE "FinancialCategory" AS ENUM ('monthly_fee', 'medicine', 'supplies', 'extra_service', 'other');

-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('pending', 'paid', 'overdue', 'partially_paid', 'canceled', 'disputed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 'pix', 'boleto', 'other');

-- CreateTable
CREATE TABLE "houses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" VARCHAR(2),
    "zip_code" VARCHAR(10),
    "phone" VARCHAR(20),
    "email" TEXT,
    "owner_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "custom_role" TEXT,
    "phone" VARCHAR(20),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residents" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "rg" VARCHAR(20),
    "birth_date" DATE NOT NULL,
    "gender" "ResidentGender" NOT NULL DEFAULT 'M',
    "marital_status" "MaritalStatus",
    "nationality" VARCHAR(100) DEFAULT 'Brasileira',
    "phone" VARCHAR(20),
    "email" TEXT,
    "address" VARCHAR(500),
    "address_number" VARCHAR(20),
    "address_complement" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "zip_code" VARCHAR(10),
    "emergency_contact_name" TEXT NOT NULL,
    "emergency_contact_phone" VARCHAR(20) NOT NULL,
    "emergency_contact_relationship" VARCHAR(100),
    "emergency_contact_email" TEXT,
    "medical_history" JSONB DEFAULT '{}',
    "blood_type" "BloodType",
    "photo_url" VARCHAR(500),
    "photo_updated_at" TIMESTAMP(3),
    "admission_date" DATE NOT NULL,
    "discharge_date" DATE,
    "status" "ResidentStatus" NOT NULL DEFAULT 'active',
    "reason_if_inactive" VARCHAR(500),
    "notes" TEXT,
    "special_needs" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" VARCHAR(255),
    "description" VARCHAR(500),
    "file_url" VARCHAR(500) NOT NULL,
    "file_size" INTEGER,
    "file_type" VARCHAR(50),
    "issue_date" DATE,
    "expires_at" DATE,
    "is_expired" BOOLEAN NOT NULL DEFAULT false,
    "status" "DocumentStatus" NOT NULL DEFAULT 'valid',
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(500),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active_ingredient" VARCHAR(255),
    "dosage" VARCHAR(100),
    "measurement_unit" "MeasurementUnit",
    "frequency" VARCHAR(100),
    "frequency_description" VARCHAR(255),
    "times_per_day" INTEGER,
    "scheduled_times" TEXT[],
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "prescription_date" DATE,
    "prescriber_name" TEXT,
    "prescriber_crm" VARCHAR(20),
    "prescriber_phone" VARCHAR(20),
    "prescriber_email" TEXT,
    "pharmacy_code" VARCHAR(50),
    "pharmacy_name" VARCHAR(255),
    "pharmacy_batch_number" VARCHAR(100),
    "pharmacy_expiration" DATE,
    "pharmacy_cnpj" VARCHAR(14),
    "side_effects" TEXT,
    "contraindications" TEXT,
    "interaction_warnings" TEXT,
    "special_instructions" TEXT,
    "instructions_for_caregiver" TEXT,
    "status" "MedicationStatus" NOT NULL DEFAULT 'active',
    "reason_if_inactive" VARCHAR(500),
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_logs" (
    "id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "administered_by" TEXT NOT NULL,
    "scheduled_time" VARCHAR(5),
    "administered_at" TIMESTAMP(3),
    "status" "MedicationLogStatus" NOT NULL DEFAULT 'administered',
    "dosage_actually_given" VARCHAR(100),
    "reason_if_not_given" TEXT,
    "resident_complaint" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_integrations" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "pharmacy_name" VARCHAR(255) NOT NULL,
    "pharmacy_cnpj" VARCHAR(14) NOT NULL,
    "api_endpoint" VARCHAR(500),
    "api_key" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shift" "WorkShift" NOT NULL,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "confirmed_by_user" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "status" "ScheduleStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "absence_reason" VARCHAR(500),
    "absence_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" VARCHAR(100),
    "phone" VARCHAR(20),
    "email" TEXT,
    "visit_date" DATE NOT NULL,
    "visit_time_in" VARCHAR(5),
    "visit_time_out" VARCHAR(5),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_records" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "type" "FinancialType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "original_amount" DECIMAL(10,2),
    "description" VARCHAR(500) NOT NULL,
    "category" "FinancialCategory" NOT NULL DEFAULT 'monthly_fee',
    "issue_date" DATE NOT NULL,
    "due_date" DATE,
    "paid_date" DATE,
    "payment_method" "PaymentMethod",
    "bank_account" VARCHAR(50),
    "check_number" VARCHAR(20),
    "status" "FinancialStatus" NOT NULL DEFAULT 'pending',
    "nfe_number" VARCHAR(100),
    "nfe_issued_at" TIMESTAMP(3),
    "nfe_series" VARCHAR(10),
    "nfe_rps_number" VARCHAR(20),
    "invoice_number" VARCHAR(50),
    "reference_month" DATE,
    "notes" TEXT,
    "attachment_url" VARCHAR(500),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schedule_suggestions" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "suggestions" JSONB NOT NULL,
    "conflicts" JSONB NOT NULL DEFAULT '[]',
    "absence_risk" JSONB NOT NULL DEFAULT '[]',
    "generated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_schedule_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "diagnoses" TEXT[],
    "status" "CarePlanStatus" NOT NULL DEFAULT 'active',
    "start_date" DATE NOT NULL,
    "review_date" DATE,
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_tasks" (
    "id" TEXT NOT NULL,
    "care_plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "CarePlanTaskCategory" NOT NULL DEFAULT 'other',
    "frequency" VARCHAR(100),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "due_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plan_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resident_risk_scores" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "fall_risk" INTEGER NOT NULL,
    "infection_risk" INTEGER NOT NULL,
    "malnutrition_risk" INTEGER NOT NULL,
    "overall_risk" INTEGER NOT NULL,
    "risk_factors" JSONB NOT NULL DEFAULT '[]',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resident_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "house_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "entity_type" VARCHAR(50),
    "entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_house_id_idx" ON "users"("house_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "residents_cpf_key" ON "residents"("cpf");

-- CreateIndex
CREATE INDEX "residents_house_id_idx" ON "residents"("house_id");

-- CreateIndex
CREATE INDEX "documents_resident_id_idx" ON "documents"("resident_id");

-- CreateIndex
CREATE INDEX "documents_house_id_idx" ON "documents"("house_id");

-- CreateIndex
CREATE INDEX "documents_expires_at_idx" ON "documents"("expires_at");

-- CreateIndex
CREATE INDEX "documents_is_expired_idx" ON "documents"("is_expired");

-- CreateIndex
CREATE INDEX "medications_resident_id_idx" ON "medications"("resident_id");

-- CreateIndex
CREATE INDEX "medications_status_idx" ON "medications"("status");

-- CreateIndex
CREATE INDEX "medication_logs_medication_id_idx" ON "medication_logs"("medication_id");

-- CreateIndex
CREATE INDEX "medication_logs_resident_id_idx" ON "medication_logs"("resident_id");

-- CreateIndex
CREATE INDEX "medication_logs_administered_at_idx" ON "medication_logs"("administered_at" DESC);

-- CreateIndex
CREATE INDEX "medication_logs_scheduled_time_idx" ON "medication_logs"("scheduled_time");

-- CreateIndex
CREATE INDEX "pharmacy_integrations_house_id_idx" ON "pharmacy_integrations"("house_id");

-- CreateIndex
CREATE INDEX "work_schedules_user_id_idx" ON "work_schedules"("user_id");

-- CreateIndex
CREATE INDEX "work_schedules_date_idx" ON "work_schedules"("date");

-- CreateIndex
CREATE INDEX "work_schedules_house_id_idx" ON "work_schedules"("house_id");

-- CreateIndex
CREATE INDEX "work_schedules_status_idx" ON "work_schedules"("status");

-- CreateIndex
CREATE INDEX "work_schedules_house_id_date_idx" ON "work_schedules"("house_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "work_schedules_user_id_date_shift_key" ON "work_schedules"("user_id", "date", "shift");

-- CreateIndex
CREATE INDEX "visitors_resident_id_idx" ON "visitors"("resident_id");

-- CreateIndex
CREATE INDEX "visitors_visit_date_idx" ON "visitors"("visit_date");

-- CreateIndex
CREATE INDEX "financial_records_resident_id_idx" ON "financial_records"("resident_id");

-- CreateIndex
CREATE INDEX "financial_records_house_id_idx" ON "financial_records"("house_id");

-- CreateIndex
CREATE INDEX "financial_records_status_idx" ON "financial_records"("status");

-- CreateIndex
CREATE INDEX "financial_records_due_date_idx" ON "financial_records"("due_date");

-- CreateIndex
CREATE INDEX "financial_records_paid_date_idx" ON "financial_records"("paid_date");

-- CreateIndex
CREATE INDEX "financial_records_issue_date_idx" ON "financial_records"("issue_date" DESC);

-- CreateIndex
CREATE INDEX "financial_records_type_idx" ON "financial_records"("type");

-- CreateIndex
CREATE INDEX "financial_records_house_id_reference_month_idx" ON "financial_records"("house_id", "reference_month" DESC);

-- CreateIndex
CREATE INDEX "ai_schedule_suggestions_house_id_month_idx" ON "ai_schedule_suggestions"("house_id", "month");

-- CreateIndex
CREATE INDEX "care_plans_resident_id_idx" ON "care_plans"("resident_id");

-- CreateIndex
CREATE INDEX "care_plans_house_id_idx" ON "care_plans"("house_id");

-- CreateIndex
CREATE INDEX "care_plan_tasks_care_plan_id_idx" ON "care_plan_tasks"("care_plan_id");

-- CreateIndex
CREATE INDEX "resident_risk_scores_resident_id_idx" ON "resident_risk_scores"("resident_id");

-- CreateIndex
CREATE INDEX "resident_risk_scores_house_id_idx" ON "resident_risk_scores"("house_id");

-- CreateIndex
CREATE INDEX "audit_logs_house_id_idx" ON "audit_logs"("house_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_administered_by_fkey" FOREIGN KEY ("administered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_integrations" ADD CONSTRAINT "pharmacy_integrations_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_schedule_suggestions" ADD CONSTRAINT "ai_schedule_suggestions_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_tasks" ADD CONSTRAINT "care_plan_tasks_care_plan_id_fkey" FOREIGN KEY ("care_plan_id") REFERENCES "care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_risk_scores" ADD CONSTRAINT "resident_risk_scores_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_risk_scores" ADD CONSTRAINT "resident_risk_scores_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
