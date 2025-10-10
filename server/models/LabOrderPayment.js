const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LabOrderPayment = sequelize.define('LabOrderPayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentReference: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'payment_reference',
    comment: 'Idempotency token for payment deduplication'
  },
  patientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'patient_id',
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  appliedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'applied_amount'
  },
  appliedToOrders: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'applied_to_orders',
    comment: 'JSON array of order IDs or item IDs for audit'
  },
  paymentMethod: {
    type: DataTypes.ENUM(
      'bkash',
      'bank_transfer',
      'offline_cash',
      'offline_card',
      'mixed'
    ),
    allowNull: false,
    field: 'payment_method'
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'completed',
      'failed',
      'refunded'
    ),
    defaultValue: 'pending',
    allowNull: false
  },
  transactionId: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'transaction_id',
    comment: 'Gateway transaction ID'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Admin/patient ID who initiated payment'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  }
}, {
  tableName: 'lab_order_payments',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      fields: ['payment_reference']
    },
    {
      fields: ['patient_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['transaction_id']
    },
    {
      fields: ['created_by']
    }
  ]
});

module.exports = LabOrderPayment;
