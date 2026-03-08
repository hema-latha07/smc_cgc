import { Router } from 'express';
import { authAdmin } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import * as adminController from '../controllers/admin.controller.js';
import adminChatRoutes from './admin.chat.routes.js';

const router = Router();
router.use(authAdmin);
router.use(requireAdmin);
router.use('/chat', adminChatRoutes);

router.get('/me', adminController.getMe);
router.patch('/me', adminController.updateAdminProfile);
router.get('/dashboard', adminController.getDashboard);
router.get('/placement-report/export', adminController.exportPlacementReport);
router.get('/placement-report', adminController.getPlacementReport);
router.get('/expiring-offers', adminController.getExpiringOffers);
router.get('/audit-log', adminController.getAuditLogs);

router.get('/students', adminController.listStudents);
router.get('/students/export', adminController.exportStudents);
router.post('/students/bulk-import', adminController.bulkImportMulter, adminController.bulkImportStudents);
router.get('/students/:id/context', adminController.getStudentContext);
router.get('/students/:id', adminController.getStudent);
router.post('/students', adminController.createStudent);
router.patch('/students/:id', adminController.updateStudent);
router.delete('/students/:id', adminController.deleteStudent);
router.post('/students/:id/reset-password', adminController.resetStudentPassword);
router.get('/students/:studentId/eligible', adminController.checkEligible);

router.get('/companies', adminController.listCompanies);
router.get('/companies/export', adminController.exportCompanies);
router.get('/companies/:id', adminController.getCompany);
router.get('/companies/:id/notes', adminController.getCompanyNotes);
router.post('/companies/:id/notes', adminController.addCompanyNote);
router.post('/companies', adminController.createCompany);
router.patch('/companies/:id', adminController.updateCompany);
router.delete('/companies/:id', adminController.deleteCompany);

router.get('/drives', adminController.listDrives);
router.get('/drives/export', adminController.exportDrives);
router.get('/drives/:id', adminController.getDrive);
router.post('/drives', adminController.createDrive);
router.patch('/drives/:id', adminController.updateDrive);
router.delete('/drives/:id', adminController.deleteDrive);

router.post('/applications/round-decision-bulk', adminController.roundDecisionBulk);
router.post('/applications/:id/round-decision', adminController.roundDecision);
router.patch('/applications/:id/status', adminController.updateApplicationStatus);
router.get('/drives/:driveId/students', adminController.getDriveStudents);
router.get('/drives/:driveId/export', adminController.exportDriveStudents);
router.post('/applications/:id/offer', adminController.uploadOfferMulter, adminController.uploadOffer);

router.get('/events', adminController.listEvents);
router.get('/events/:id', adminController.getEvent);
router.post('/events', adminController.createEvent);
router.post('/events/:id/duplicate', adminController.duplicateEvent);
router.patch('/events/:id', adminController.updateEvent);
router.delete('/events/:id', adminController.deleteEvent);
router.get('/events/:eventId/registrations', adminController.getEventRegistrations);
router.get('/events/:eventId/export', adminController.exportEventRegistrations);

router.get('/recycle-bin/students', adminController.listDeletedStudents);
router.get('/recycle-bin/companies', adminController.listDeletedCompanies);
router.get('/recycle-bin/drives', adminController.listDeletedDrives);
router.get('/recycle-bin/events', adminController.listDeletedEvents);
router.post('/recycle-bin/delete', adminController.bulkDelete);
router.post('/recycle-bin/students/:id/restore', adminController.restoreStudent);
router.post('/recycle-bin/companies/:id/restore', adminController.restoreCompany);
router.post('/recycle-bin/drives/:id/restore', adminController.restoreDrive);
router.post('/recycle-bin/events/:id/restore', adminController.restoreEvent);

router.post('/notifications/broadcast', adminController.broadcastNotification);

export default router;
