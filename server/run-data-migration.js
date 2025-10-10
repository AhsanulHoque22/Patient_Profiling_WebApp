#!/usr/bin/env node

/**
 * Data Migration Script for Unified Lab Payments
 * 
 * This script converts existing lab test orders from JSON testIds format
 * to the new itemized format with unified payment fields.
 * 
 * Run this AFTER running the schema migrations.
 */

const { sequelize } = require('./config/database');
const { LabTestOrder, LabTest, LabTestOrderItem, SystemSetting } = require('./models');
const { Op } = require('sequelize');

async function migrateExistingData() {
  console.log('🔄 Starting Data Migration for Unified Lab Payments...\n');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');

    // Get default payment threshold
    const defaultThreshold = await SystemSetting.findOne({
      where: { settingKey: 'lab_payment_threshold_default' }
    });
    const threshold = defaultThreshold ? parseFloat(defaultThreshold.settingValue) : 0.5;
    console.log(`📊 Using payment threshold: ${(threshold * 100).toFixed(0)}%\n`);

    // Get all existing lab test orders with JSON testIds
    const existingOrders = await LabTestOrder.findAll({
      where: {
        testIds: {
          [Op.ne]: null
        }
      },
      attributes: ['id', 'testIds', 'totalAmount', 'paidAmount', 'dueAmount', 'status']
    });

    console.log(`📋 Found ${existingOrders.length} existing orders to migrate\n`);

    if (existingOrders.length === 0) {
      console.log('✅ No orders to migrate. Data migration completed.\n');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    for (const order of existingOrders) {
      const transaction = await sequelize.transaction();
      
      try {
        console.log(`🔄 Migrating order ${order.id}...`);

        let testIds = [];
        
        // Parse testIds JSON
        if (typeof order.testIds === 'string') {
          try {
            testIds = JSON.parse(order.testIds);
          } catch (parseError) {
            console.log(`⚠️  Could not parse testIds for order ${order.id}: ${parseError.message}`);
            await transaction.rollback();
            continue;
          }
        } else if (Array.isArray(order.testIds)) {
          testIds = order.testIds;
        }
        
        if (!Array.isArray(testIds) || testIds.length === 0) {
          console.log(`⚠️  Skipping order ${order.id} - no valid testIds found`);
          await transaction.rollback();
          continue;
        }
        
        // Get test details for each testId
        const tests = await LabTest.findAll({
          where: { id: testIds },
          attributes: ['id', 'name', 'price'],
          transaction
        });
        
        if (tests.length !== testIds.length) {
          console.log(`⚠️  Order ${order.id}: Some tests not found (${tests.length}/${testIds.length})`);
          await transaction.rollback();
          continue;
        }
        
        let orderTotal = 0;
        const orderItems = [];
        
        // Create order items for each test
        for (const test of tests) {
          const orderItem = await LabTestOrderItem.create({
            orderId: order.id,
            labTestId: test.id,
            testName: test.name,
            unitPrice: test.price,
            status: 'ordered',
            isSelected: true,
            sampleAllowed: false
          }, { transaction });
          
          orderItems.push(orderItem);
          orderTotal += parseFloat(test.price);
        }
        
        // Calculate payment status
        const paidAmount = parseFloat(order.paidAmount || 0);
        const orderDue = orderTotal - paidAmount;
        const sampleAllowed = paidAmount > 0 && (paidAmount / orderTotal) >= threshold;
        
        // Update order with new fields
        await order.update({
          orderTotal,
          orderPaid: paidAmount,
          orderDue,
          paymentThreshold: threshold,
          sampleAllowed
        }, { transaction });
        
        // Update order items sample_allowed status
        if (sampleAllowed) {
          await LabTestOrderItem.update(
            { sampleAllowed: true },
            { 
              where: { orderId: order.id },
              transaction
            }
          );
        }
        
        await transaction.commit();
        
        console.log(`✅ Migrated order ${order.id}: ${orderItems.length} items, total: ${orderTotal}, paid: ${paidAmount}`);
        migratedCount++;
        
      } catch (error) {
        await transaction.rollback();
        console.error(`❌ Error migrating order ${order.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Data migration completed!');
    console.log(`📊 Migration Summary:`);
    console.log(`  • Orders migrated: ${migratedCount}`);
    console.log(`  • Errors: ${errorCount}`);
    console.log(`  • Total processed: ${existingOrders.length}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some orders failed to migrate. Check the logs above for details.');
    } else {
      console.log('\n✅ All orders migrated successfully!');
    }

    console.log('\n🚀 Next Steps:');
    console.log('  1. Test the unified payment endpoints');
    console.log('  2. Verify data integrity in the admin panel');
    console.log('  3. Update frontend to use the new unified payment system');

  } catch (error) {
    console.error('❌ Data migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateExistingData().catch(console.error);
}

module.exports = { migrateExistingData };
