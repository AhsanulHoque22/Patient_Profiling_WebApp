'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lab_test_order_items', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lab_test_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lab_test_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lab_tests',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      test_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Denormalized test name for performance'
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM(
          'ordered',
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
      is_selected: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Patient can deselect before payment/sample'
      },
      sample_allowed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Derived flag set when threshold met'
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
    await queryInterface.addIndex('lab_test_order_items', ['order_id']);
    await queryInterface.addIndex('lab_test_order_items', ['lab_test_id']);
    await queryInterface.addIndex('lab_test_order_items', ['status']);
    await queryInterface.addIndex('lab_test_order_items', ['is_selected']);
    await queryInterface.addIndex('lab_test_order_items', ['sample_allowed']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('lab_test_order_items');
  }
};
