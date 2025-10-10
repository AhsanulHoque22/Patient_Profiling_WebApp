const express = require('express');
const router = express.Router();
const unifiedLabPaymentController = require('../controllers/unifiedLabPaymentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation middleware
const batchPaymentValidation = [
  body('paymentMethod')
    .isIn(['bkash', 'bank_transfer', 'offline_cash', 'offline_card', 'mixed'])
    .withMessage('Invalid payment method'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Invalid payment amount'),
  body('target')
    .isObject()
    .withMessage('Target must be an object'),
  body('target.orders')
    .optional()
    .isArray()
    .withMessage('Orders must be an array'),
  body('target.items')
    .optional()
    .isArray()
    .withMessage('Items must be an array'),
  body('idempotencyKey')
    .notEmpty()
    .withMessage('Idempotency key is required'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes too long')
];

const itemSelectionValidation = [
  body('isSelected')
    .isBoolean()
    .withMessage('isSelected must be a boolean')
];

const itemCancellationValidation = [
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason too long'),
  body('cancelledBy')
    .isIn(['patient', 'admin'])
    .withMessage('Invalid cancellation source')
];

// Patient routes
router.get(
  '/patients/me/pending-lab-payments',
  authenticateToken,
  (req, res, next) => {
    // Set patientId from authenticated user
    req.params.patientId = req.user.patientId || req.user.id;
    next();
  },
  unifiedLabPaymentController.getPendingLabPayments
);

router.get(
  '/patients/:patientId/pending-lab-payments',
  authenticateToken,
  unifiedLabPaymentController.getPendingLabPayments
);

router.post(
  '/patients/me/pay-lab-orders',
  authenticateToken,
  (req, res, next) => {
    // Set patientId from authenticated user
    req.params.patientId = req.user.patientId || req.user.id;
    next();
  },
  batchPaymentValidation,
  unifiedLabPaymentController.createBatchPayment
);

router.post(
  '/patients/:patientId/pay-lab-orders',
  authenticateToken,
  batchPaymentValidation,
  unifiedLabPaymentController.createBatchPayment
);

router.put(
  '/lab-orders/:orderId/toggle-item-selection/:itemId',
  authenticateToken,
  itemSelectionValidation,
  unifiedLabPaymentController.toggleItemSelection
);

router.post(
  '/lab-orders/:orderId/cancel-item/:itemId',
  authenticateToken,
  itemCancellationValidation,
  unifiedLabPaymentController.cancelOrderItem
);

// Admin routes
router.post(
  '/admin/patients/:patientId/batch-lab-payment',
  authenticateToken,
  authorizeRoles(['admin']),
  [
    ...batchPaymentValidation,
    body('processedByAdminId')
      .isInt({ min: 1 })
      .withMessage('Valid admin ID is required')
  ],
  unifiedLabPaymentController.processAdminBatchPayment
);

// Webhook route for payment confirmation
router.post(
  '/payments/webhook',
  unifiedLabPaymentController.processPaymentAllocation
);


module.exports = router;
