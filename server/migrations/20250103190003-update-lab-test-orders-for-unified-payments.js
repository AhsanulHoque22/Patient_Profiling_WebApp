'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new fields to lab_test_orders table
    await queryInterface.addColumn('lab_test_orders', 'order_total', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Total amount for all tests in this order'
    });

    await queryInterface.addColumn('lab_test_orders', 'order_paid', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
      comment: 'Total amount paid for this order'
    });

    await queryInterface.addColumn('lab_test_orders', 'order_due', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Remaining amount due (computed or stored)'
    });

    await queryInterface.addColumn('lab_test_orders', 'payment_threshold', {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Payment threshold for sample processing (0.00-1.00), nullable to fallback to global config'
    });

    await queryInterface.addColumn('lab_test_orders', 'sample_allowed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Derived flag when payment threshold is met'
    });

    // Add indexes for performance
    await queryInterface.addIndex('lab_test_orders', ['order_total']);
    await queryInterface.addIndex('lab_test_orders', ['order_paid']);
    await queryInterface.addIndex('lab_test_orders', ['sample_allowed']);
    await queryInterface.addIndex('lab_test_orders', ['payment_threshold']);
  },

  async down(queryInterface, Sequelize) {
    // Remove the added columns
    await queryInterface.removeColumn('lab_test_orders', 'order_total');
    await queryInterface.removeColumn('lab_test_orders', 'order_paid');
    await queryInterface.removeColumn('lab_test_orders', 'order_due');
    await queryInterface.removeColumn('lab_test_orders', 'payment_threshold');
    await queryInterface.removeColumn('lab_test_orders', 'sample_allowed');
  }
};
