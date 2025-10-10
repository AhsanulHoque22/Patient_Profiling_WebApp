'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lab_order_payment_allocations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lab_order_payments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      order_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lab_test_order_items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      applied_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Amount allocated to this specific order item'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('lab_order_payment_allocations', ['payment_id']);
    await queryInterface.addIndex('lab_order_payment_allocations', ['order_item_id']);
    
    // Unique constraint to prevent double allocation
    await queryInterface.addConstraint('lab_order_payment_allocations', {
      fields: ['payment_id', 'order_item_id'],
      type: 'unique',
      name: 'unique_payment_item_allocation'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('lab_order_payment_allocations');
  }
};
