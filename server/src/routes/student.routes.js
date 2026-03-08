import { Router } from 'express';
import { authStudent } from '../middleware/auth.js';
import * as studentController from '../controllers/student.controller.js';
import studentChatRoutes from './student.chat.routes.js';

const router = Router();
router.use(authStudent);
router.use('/chat', studentChatRoutes);

router.get('/me', studentController.me);
router.patch('/me', studentController.updateProfile);
router.post('/me/change-password', studentController.changePassword);
router.post('/me/resume', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  studentController.uploadResumeMulter(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 20MB.' });
      if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'Unexpected field. Send the file in a field named "resume".' });
      return res.status(400).json({ error: err.message || 'Upload failed. Use PDF only (max 20MB).' });
    }
    if (!req.file && !contentType.includes('multipart')) {
      console.warn('[resume] Request missing multipart; content-type:', contentType);
    }
    next();
  });
}, studentController.uploadResume);
router.get('/me/resume', studentController.downloadResume);
router.delete('/me/resume', studentController.deleteResume);
router.get('/drives', studentController.getDrives);
router.post('/drives/:driveId/apply', studentController.apply);
router.get('/applications', studentController.getApplications);
router.get('/offers', studentController.getOffers);
router.post('/offers/:offerId/decision', studentController.offerDecision);
router.get('/offers/:offerId/download', studentController.downloadOfferPdf);
router.get('/events', studentController.getEvents);
router.post('/events/:eventId/register', studentController.registerEvent);
router.delete('/events/:eventId/register', studentController.unregisterEvent);
router.get('/notifications/unread-count', studentController.getUnreadNotificationCount);
router.get('/notifications', studentController.getNotifications);
router.post('/notifications/:id/read', studentController.markNotificationRead);

export default router;
