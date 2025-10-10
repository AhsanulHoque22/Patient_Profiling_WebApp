'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lab_order_payments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      payment_reference: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Idempotency token for payment deduplication'
      },
      patient_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      applied_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      applied_to_orders: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON array of order IDs or item IDs for audit'
      },
      payment_method: {
        type: Sequelize.ENUM(
          'bkash',
          'bank_transfer',
          'offline_cash',
          'offline_card',
          'mixed'
        ),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'completed',
          'failed',
          'refunded'
        ),
        defaultValue: 'pending',
        allowNull: false
      },
      transaction_id: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Gateway transaction ID'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin/patient ID who initiated payment'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('lab_order_payments', ['payment_reference']);
    await queryInterface.addIndex('lab_order_payments', ['patient_id']);
    await queryInterface.addIndex('lab_order_payments', ['status']);
    await queryInterface.addIndex('lab_order_payments', ['transaction_id']);
    await queryInterface.addIndex('lab_order_payments', ['created_by']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('lab_order_payments');
  }
};
