#!/usr/bin/env node

/**
 * Safe Database Migration Runner for Unified Lab Payments
 * 
 * This script safely runs migrations by checking for existing tables/indexes first.
 */

const { sequelize } = require('./config/database');
const { QueryInterface } = require('sequelize');

async function checkTableExists(tableName) {
  try {
    const [results] = await sequelize.query(`SHOW TABLES LIKE '${tableName}'`);
    return results.length > 0;
  } catch (error) {
    return false;
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    const [results] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${columnName}'`);
    return results.length > 0;
  } catch (error) {
    return false;
  }
}

async function checkIndexExists(tableName, indexName) {
  try {
    const [results] = await sequelize.query(`SHOW INDEX FROM \`${tableName}\` WHERE Key_name = '${indexName}'`);
    return results.length > 0;
  } catch (error) {
    return false;
  }
}

async function runSafeMigrations() {
  console.log('🚀 Starting Safe Unified Lab Payment System Migrations...\n');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');

    // 1. Create lab_test_order_items table
    console.log('📋 Checking lab_test_order_items table...');
    const orderItemsExists = await checkTableExists('lab_test_order_items');
    
    if (!orderItemsExists) {
      console.log('📋 Creating lab_test_order_items table...');
      await sequelize.query(`
        CREATE TABLE \`lab_test_order_items\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`order_id\` INT NOT NULL,
          \`lab_test_id\` INT NOT NULL,
          \`test_name\` VARCHAR(200) NOT NULL COMMENT 'Denormalized test name for performance',
          \`unit_price\` DECIMAL(10,2) NOT NULL,
          \`status\` ENUM('ordered', 'cancelled_by_patient', 'cancelled_by_admin', 'sample_collection_scheduled', 'sample_collected', 'processing', 'results_ready', 'completed') NOT NULL DEFAULT 'ordered',
          \`is_selected\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Patient can deselect before payment/sample',
          \`sample_allowed\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Derived flag set when threshold met',
          \`created_at\` DATETIME NOT NULL,
          \`updated_at\` DATETIME NOT NULL,
          PRIMARY KEY (\`id\`),
          FOREIGN KEY (\`order_id\`) REFERENCES \`lab_test_orders\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (\`lab_test_id\`) REFERENCES \`lab_tests\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB;
      `);
      console.log('✅ lab_test_order_items table created successfully.\n');
    } else {
      console.log('✅ lab_test_order_items table already exists.\n');
    }

    // 2. Create lab_order_payments table
    console.log('📋 Checking lab_order_payments table...');
    const orderPaymentsExists = await checkTableExists('lab_order_payments');
    
    if (!orderPaymentsExists) {
      console.log('📋 Creating lab_order_payments table...');
      await sequelize.query(`
        CREATE TABLE \`lab_order_payments\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`payment_reference\` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Idempotency token for payment deduplication',
          \`patient_id\` INT NOT NULL,
          \`applied_amount\` DECIMAL(10,2) NOT NULL,
          \`applied_to_orders\` JSON NULL COMMENT 'JSON array of order IDs or item IDs for audit',
          \`payment_method\` ENUM('bkash', 'bank_transfer', 'offline_cash', 'offline_card', 'mixed') NOT NULL,
          \`status\` ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
          \`transaction_id\` VARCHAR(200) NULL COMMENT 'Gateway transaction ID',
          \`created_by\` INT NULL COMMENT 'Admin/patient ID who initiated payment',
          \`created_at\` DATETIME NOT NULL,
          \`completed_at\` DATETIME NULL,
          \`updated_at\` DATETIME NOT NULL,
          PRIMARY KEY (\`id\`),
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB;
      `);
      console.log('✅ lab_order_payments table created successfully.\n');
    } else {
      console.log('✅ lab_order_payments table already exists.\n');
    }

    // 3. Create lab_order_payment_allocations table
    console.log('📋 Checking lab_order_payment_allocations table...');
    const allocationsExists = await checkTableExists('lab_order_payment_allocations');
    
    if (!allocationsExists) {
      console.log('📋 Creating lab_order_payment_allocations table...');
      await sequelize.query(`
        CREATE TABLE \`lab_order_payment_allocations\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`payment_id\` INT NOT NULL,
          \`order_item_id\` INT NOT NULL,
          \`applied_amount\` DECIMAL(10,2) NOT NULL COMMENT 'Amount allocated to this specific order item',
          \`created_at\` DATETIME NOT NULL,
          \`updated_at\` DATETIME NOT NULL,
          PRIMARY KEY (\`id\`),
          FOREIGN KEY (\`payment_id\`) REFERENCES \`lab_order_payments\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (\`order_item_id\`) REFERENCES \`lab_test_order_items\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
          UNIQUE KEY \`unique_payment_item_allocation\` (\`payment_id\`, \`order_item_id\`)
        ) ENGINE=InnoDB;
      `);
      console.log('✅ lab_order_payment_allocations table created successfully.\n');
    } else {
      console.log('✅ lab_order_payment_allocations table already exists.\n');
    }

    // 4. Add new columns to lab_test_orders table
    console.log('📋 Checking lab_test_orders table for new columns...');
    
    const columnsToAdd = [
      { name: 'order_total', type: 'DECIMAL(10,2) NULL COMMENT "Total amount for all tests in this order"' },
      { name: 'order_paid', type: 'DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT "Total amount paid for this order"' },
      { name: 'order_due', type: 'DECIMAL(10,2) NULL COMMENT "Remaining amount due (computed or stored)"' },
      { name: 'payment_threshold', type: 'DECIMAL(3,2) NULL COMMENT "Payment threshold for sample processing (0.00-1.00), nullable to fallback to global config"' },
      { name: 'sample_allowed', type: 'TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Derived flag when payment threshold is met"' }
    ];

    for (const column of columnsToAdd) {
      const columnExists = await checkColumnExists('lab_test_orders', column.name);
      if (!columnExists) {
        console.log(`📋 Adding column ${column.name} to lab_test_orders...`);
        await sequelize.query(`ALTER TABLE \`lab_test_orders\` ADD COLUMN \`${column.name}\` ${column.type};`);
        console.log(`✅ Column ${column.name} added successfully.`);
      } else {
        console.log(`✅ Column ${column.name} already exists.`);
      }
    }

    // 5. Create system_settings table if it doesn't exist
    console.log('📋 Checking system_settings table...');
    const systemSettingsExists = await checkTableExists('system_settings');
    
    if (!systemSettingsExists) {
      console.log('📋 Creating system_settings table...');
      await sequelize.query(`
        CREATE TABLE \`system_settings\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`setting_key\` VARCHAR(100) NOT NULL UNIQUE,
          \`setting_value\` TEXT NOT NULL,
          \`description\` TEXT NULL,
          \`created_at\` DATETIME NOT NULL,
          \`updated_at\` DATETIME NOT NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB;
      `);
      console.log('✅ system_settings table created successfully.\n');
    } else {
      console.log('✅ system_settings table already exists.\n');
    }

    // 6. Insert default payment threshold setting
    console.log('📋 Checking default payment threshold setting...');
    const [existingSetting] = await sequelize.query(`
      SELECT * FROM \`system_settings\` WHERE \`setting_key\` = 'lab_payment_threshold_default'
    `);
    
    if (existingSetting.length === 0) {
      console.log('📋 Inserting default payment threshold setting...');
      await sequelize.query(`
        INSERT INTO \`system_settings\` (\`setting_key\`, \`setting_value\`, \`description\`, \`created_at\`, \`updated_at\`)
        VALUES ('lab_payment_threshold_default', '0.50', 'Default payment threshold (50%) required to allow sample processing for lab tests', NOW(), NOW())
      `);
      console.log('✅ Default payment threshold setting inserted successfully.\n');
    } else {
      console.log('✅ Default payment threshold setting already exists.\n');
    }

    console.log('🎉 All migrations completed successfully!');
    console.log('\n📊 Migration Summary:');
    console.log('  • lab_test_order_items table ✓');
    console.log('  • lab_order_payments table ✓');
    console.log('  • lab_order_payment_allocations table ✓');
    console.log('  • Unified payment fields added to lab_test_orders ✓');
    console.log('  • system_settings table with payment threshold ✓');
    console.log('\n🚀 Next Steps:');
    console.log('  1. Run the data migration script: node run-data-migration.js');
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
  runSafeMigrations().catch(console.error);
}

module.exports = { runSafeMigrations };
