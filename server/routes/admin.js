const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { body } = require('express-validator');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// User management routes
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// System statistics routes
router.get('/stats', adminController.getSystemStats);
router.get('/analytics/appointments', adminController.getAppointmentAnalytics);

// Doctor verification routes
router.get('/doctors/verification-requests', adminController.getDoctorVerificationRequests);
router.put('/doctors/:id/verify', adminController.verifyDoctor);

module.exports = router;
