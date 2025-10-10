const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LabOrderPaymentAllocation = sequelize.define('LabOrderPaymentAllocation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'payment_id',
    references: {
      model: 'lab_order_payments',
      key: 'id'
    }
  },
  orderItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'order_item_id',
    references: {
      model: 'lab_test_order_items',
      key: 'id'
    }
  },
  appliedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'applied_amount',
    comment: 'Amount allocated to this specific order item'
  }
}, {
  tableName: 'lab_order_payment_allocations',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      fields: ['payment_id']
    },
    {
      fields: ['order_item_id']
    },
    {
      unique: true,
      fields: ['payment_id', 'order_item_id'],
      name: 'unique_payment_item_allocation'
    }
  ]
});

module.exports = LabOrderPaymentAllocation;
