'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { LabTestOrder, LabTest, LabTestOrderItem, SystemSetting } = require('../models');
    
    console.log('Starting migration of existing lab test data...');
    
    try {
      // Get all existing lab test orders with JSON testIds
      const existingOrders = await queryInterface.sequelize.query(
        `SELECT id, testIds, totalAmount, paidAmount, dueAmount FROM lab_test_orders WHERE testIds IS NOT NULL`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      console.log(`Found ${existingOrders.length} existing orders to migrate`);
      
      // Get default payment threshold
      const defaultThreshold = await SystemSetting.findOne({
        where: { settingKey: 'lab_payment_threshold_default' }
      });
      const threshold = defaultThreshold ? parseFloat(defaultThreshold.settingValue) : 0.5;
      
      for (const order of existingOrders) {
        const transaction = await queryInterface.sequelize.transaction();
        
        try {
          let testIds = [];
          
          // Parse testIds JSON
          if (typeof order.testIds === 'string') {
            testIds = JSON.parse(order.testIds);
          } else if (Array.isArray(order.testIds)) {
            testIds = order.testIds;
          }
          
          if (!Array.isArray(testIds) || testIds.length === 0) {
            console.log(`Skipping order ${order.id} - no valid testIds found`);
            await transaction.commit();
            continue;
          }
          
          // Get test details for each testId
          const tests = await LabTest.findAll({
            where: { id: testIds },
            attributes: ['id', 'name', 'price']
          });
          
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
          const sampleAllowed = paidAmount / orderTotal >= threshold;
          
          // Update order with new fields
          await queryInterface.sequelize.query(
            `UPDATE lab_test_orders SET 
              order_total = :orderTotal,
              order_paid = :paidAmount,
              order_due = :orderDue,
              payment_threshold = :threshold,
              sample_allowed = :sampleAllowed
            WHERE id = :orderId`,
            {
              replacements: {
                orderTotal,
                paidAmount,
                orderDue,
                threshold,
                sampleAllowed,
                orderId: order.id
              },
              transaction
            }
          );
          
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
          
          console.log(`Migrated order ${order.id}: ${orderItems.length} items, total: ${orderTotal}, paid: ${paidAmount}`);
          
          await transaction.commit();
        } catch (error) {
          console.error(`Error migrating order ${order.id}:`, error);
          await transaction.rollback();
        }
      }
      
      console.log('Migration completed successfully');
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Rolling back migration...');
    
    // Remove order items created during migration
    await queryInterface.sequelize.query(
      `DELETE FROM lab_test_order_items WHERE order_id IN (
        SELECT id FROM lab_test_orders WHERE order_total IS NOT NULL
      )`
    );
    
    // Reset order fields
    await queryInterface.sequelize.query(
      `UPDATE lab_test_orders SET 
        order_total = NULL,
        order_paid = 0,
        order_due = NULL,
        payment_threshold = NULL,
        sample_allowed = false
      WHERE order_total IS NOT NULL`
    );
    
    console.log('Rollback completed');
  }
};
