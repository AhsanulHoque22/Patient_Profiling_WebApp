'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'approved' status to the existing enum
    await queryInterface.sequelize.query(`
      ALTER TABLE \`lab_test_order_items\` 
      MODIFY COLUMN \`status\` ENUM(
        'ordered',
        'approved',
        'cancelled_by_patient',
        'cancelled_by_admin',
        'sample_collection_scheduled',
        'sample_collected',
        'processing',
        'results_ready',
        'completed'
      ) NOT NULL DEFAULT 'ordered'
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove 'approved' status from the enum
    await queryInterface.sequelize.query(`
      ALTER TABLE \`lab_test_order_items\` 
      MODIFY COLUMN \`status\` ENUM(
        'ordered',
        'cancelled_by_patient',
        'cancelled_by_admin',
        'sample_collection_scheduled',
        'sample_collected',
        'processing',
        'results_ready',
        'completed'
      ) NOT NULL DEFAULT 'ordered'
    `);
  }
};
