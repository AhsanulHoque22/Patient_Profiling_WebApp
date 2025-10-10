#!/usr/bin/env node

/**
 * Database Migration Runner for Unified Lab Payments
 * 
 * This script runs the database migrations required for the unified lab payment system.
 * Run this script after implementing the unified payment system.
 */

const { sequelize } = require('./config/database');
const { QueryInterface } = require('sequelize');

async function runMigrations() {
  console.log('🚀 Starting Unified Lab Payment System Migrations...\n');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');

    // Run migrations in sequence
    const migrations = [
      '20250103190000-create-lab-test-order-items.js',
      '20250103190001-create-lab-order-payments.js', 
      '20250103190002-create-lab-order-payment-allocations.js',
      '20250103190003-update-lab-test-orders-for-unified-payments.js',
      '20250103190004-add-system-settings-for-payment-threshold.js'
    ];

    for (const migrationFile of migrations) {
      console.log(`📋 Running migration: ${migrationFile}`);
      
      try {
        const migration = require(`./migrations/${migrationFile}`);
        await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
        console.log(`✅ Migration ${migrationFile} completed successfully.\n`);
      } catch (error) {
        console.error(`❌ Migration ${migrationFile} failed:`, error.message);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
    console.log('\n📊 Migration Summary:');
    console.log('  • Created lab_test_order_items table');
    console.log('  • Created lab_order_payments table');
    console.log('  • Created lab_order_payment_allocations table');
    console.log('  • Added unified payment fields to lab_test_orders');
    console.log('  • Added system settings for payment threshold');
    console.log('\n⚠️  Next Steps:');
    console.log('  1. Run the data migration script to convert existing data');
    console.log('  2. Test the unified payment endpoints');
    console.log('  3. Update frontend to use the new unified payment system');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations().catch(console.error);
}

module.exports = { runMigrations };
