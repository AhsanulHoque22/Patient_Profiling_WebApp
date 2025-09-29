const express = require('express');
const patientController = require('../controllers/patientController');
const { authenticateToken, authorizeRoles, authorizeResourceAccess } = require('../middleware/auth');
const { body } = require('express-validator');

const router = express.Router();

// Patient profile validation
const updatePatientValidation = [
  body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Valid blood type is required'),
  body('emergencyContact').optional().isLength({ min: 2, max: 100 }).withMessage('Emergency contact name must be 2-100 characters'),
  body('emergencyPhone').optional().isMobilePhone().withMessage('Valid emergency phone number is required'),
  body('insuranceProvider').optional().isLength({ max: 100 }).withMessage('Insurance provider name too long'),
  body('insuranceNumber').optional().isLength({ max: 50 }).withMessage('Insurance number too long')
];

// Medical record validation
const createMedicalRecordValidation = [
  body('doctorId').isInt().withMessage('Valid doctor ID is required'),
  body('recordType').isIn(['consultation', 'lab_result', 'imaging', 'prescription', 'vaccination', 'surgery']).withMessage('Valid record type is required'),
  body('title').isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description too long'),
  body('diagnosis').optional().isLength({ max: 1000 }).withMessage('Diagnosis too long'),
  body('treatment').optional().isLength({ max: 1000 }).withMessage('Treatment description too long'),
  body('medications').optional().isLength({ max: 1000 }).withMessage('Medications description too long'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be boolean')
];

// All routes require authentication
router.use(authenticateToken);

// Patient profile routes (with ID)
router.get('/:id/profile', authorizeRoles('patient', 'doctor', 'admin'), patientController.getPatientProfile);
router.put('/:id/profile', authorizeRoles('patient', 'admin'), authorizeResourceAccess('patient'), updatePatientValidation, patientController.updatePatientProfile);

// Patient profile routes (current user)
router.get('/profile', authorizeRoles('patient'), patientController.getCurrentPatientProfile);
router.put('/profile', authorizeRoles('patient'), updatePatientValidation, patientController.updateCurrentPatientProfile);

// Medical records routes
router.get('/:id/medical-records', authorizeRoles('patient', 'doctor', 'admin'), patientController.getMedicalRecords);
router.post('/:id/medical-records', authorizeRoles('doctor', 'admin'), createMedicalRecordValidation, patientController.createMedicalRecord);

// Appointments routes
router.get('/:id/appointments', authorizeRoles('patient', 'doctor', 'admin'), patientController.getPatientAppointments);

// Dashboard stats route
router.get('/:id/dashboard/stats', authorizeRoles('patient', 'doctor', 'admin'), patientController.getPatientDashboardStats);

module.exports = router;
