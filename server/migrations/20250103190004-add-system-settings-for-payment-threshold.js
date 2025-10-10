'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create system_settings table if it doesn't exist
    const tableExists = await queryInterface.describeTable('system_settings');
    
    if (!tableExists) {
      await queryInterface.createTable('system_settings', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        setting_key: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        setting_value: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
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

      await queryInterface.addIndex('system_settings', ['setting_key']);
    }

    // Insert default payment threshold setting
    await queryInterface.bulkInsert('system_settings', [
      {
        setting_key: 'lab_payment_threshold_default',
        setting_value: '0.50',
        description: 'Default payment threshold (50%) required to allow sample processing for lab tests',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {
      ignoreDuplicates: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the setting
    await queryInterface.bulkDelete('system_settings', {
      setting_key: 'lab_payment_threshold_default'
    });
  }
};
