import { Router } from 'express';
import * as ReportsController from '../controllers/reports.controller.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(requirePermission('view_reports'));

// ── Medications ─────────────────────────────────────────────────────────────
router.get('/medications/dashboard', ReportsController.medicationsDashboard);
router.get('/medications/adherence', ReportsController.medicationsAdherence);
router.post('/medications/generate-pdf', ReportsController.medicationsGeneratePDF);
router.post('/medications/export-excel', ReportsController.medicationsExportExcel);

// ── Residents ────────────────────────────────────────────────────────────────
router.get('/residents/dashboard', ReportsController.residentsDashboard);
router.get('/residents/occupancy', ReportsController.residentsOccupancy);
router.post('/residents/:id/generate-pdf', ReportsController.residentGeneratePDF);

// ── Financial ────────────────────────────────────────────────────────────────
router.get('/financial/dashboard', ReportsController.financialDashboard);
router.get('/financial/accounts-receivable', ReportsController.financialAccountsReceivable);
router.get('/financial/top-debtors', ReportsController.financialTopDebtors);
router.get('/financial/forecast', ReportsController.financialForecast);
router.post('/financial/generate-consolidated', ReportsController.financialGenerateConsolidated);

// ── Staff ────────────────────────────────────────────────────────────────────
router.get('/staff/dashboard', ReportsController.staffDashboard);
router.post('/staff/timesheet/generate', ReportsController.staffTimesheetGenerate);
router.post('/staff/export-excel', ReportsController.staffExportExcel);

// ── Legacy / backward-compat ─────────────────────────────────────────────────
router.get('/medications', ReportsController.medications);
router.get('/residents', ReportsController.residents);
router.get('/financial', ReportsController.financial);
router.get('/staff', ReportsController.staff);
router.get('/visitors', ReportsController.visitors);
router.post('/schedule', ReportsController.scheduleReport);

export default router;
