const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LabTestOrderItem = sequelize.define('LabTestOrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'order_id',
    references: {
      model: 'lab_test_orders',
      key: 'id'
    }
  },
  labTestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'lab_test_id',
    references: {
      model: 'lab_tests',
      key: 'id'
    }
  },
  testName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'test_name',
    comment: 'Denormalized test name for performance'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_price'
  },
  status: {
    type: DataTypes.ENUM(
      'ordered',
      'approved',
      'cancelled_by_patient',
      'cancelled_by_admin',
      'sample_collection_scheduled',
      'sample_collected',
      'processing',
      'results_ready',
      'completed'
    ),
    defaultValue: 'ordered',
    allowNull: false
  },
  isSelected: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    field: 'is_selected',
    comment: 'Patient can deselect before payment/sample'
  },
  sampleAllowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'sample_allowed',
    comment: 'Derived flag set when threshold met'
  }
}, {
  tableName: 'lab_test_order_items',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      fields: ['order_id']
    },
    {
      fields: ['lab_test_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_selected']
    },
    {
      fields: ['sample_allowed']
    }
  ]
});

module.exports = LabTestOrderItem;
