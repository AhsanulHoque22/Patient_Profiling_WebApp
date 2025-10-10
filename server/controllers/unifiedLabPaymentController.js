const { 
  LabTestOrder, 
  LabTestOrderItem, 
  LabOrderPayment, 
  LabOrderPaymentAllocation, 
  LabTest, 
  Patient, 
  User, 
  SystemSetting 
} = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

/**
 * Unified Lab Payment Controller
 * Handles batch payments, allocation logic, and threshold management
 */

// Helper function to get payment threshold (default 50%)
const getPaymentThreshold = async (orderId = null) => {
  try {
    // Check if order has custom threshold
    if (orderId) {
      const order = await LabTestOrder.findByPk(orderId, {
        attributes: ['paymentThreshold']
      });
      if (order && order.paymentThreshold !== null) {
        return parseFloat(order.paymentThreshold);
      }
    }
    
    // Get global default threshold
    const setting = await SystemSetting.findOne({
      where: { settingKey: 'lab_payment_threshold_default' }
    });
    
    return setting ? parseFloat(setting.settingValue) : 0.5;
  } catch (error) {
    console.error('Error getting payment threshold:', error);
    return 0.5; // Default fallback
  }
};

// Helper function to recalculate order totals
const recalculateOrderTotals = async (orderId) => {
  const transaction = await LabTestOrder.sequelize.transaction();
  
  try {
    const order = await LabTestOrder.findByPk(orderId, {
      include: [
        {
          model: LabTestOrderItem,
          as: 'orderItems',
          where: { isSelected: true }
        }
      ],
      transaction
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Calculate totals
    const orderTotal = order.orderItems.reduce((sum, item) => sum + parseFloat(item.unitPrice), 0);
    const orderDue = orderTotal - parseFloat(order.orderPaid || 0);
    
    // Get threshold and check if sample is allowed
    const threshold = await getPaymentThreshold(orderId);
    const sampleAllowed = order.orderPaid > 0 && (order.orderPaid / orderTotal) >= threshold;
    
    // Update order
    await order.update({
      orderTotal,
      orderDue,
      sampleAllowed
    }, { transaction });
    
    // Update order items sample_allowed status
    await LabTestOrderItem.update(
      { sampleAllowed },
      {
        where: { orderId },
        transaction
      }
    );
    
    await transaction.commit();
    
    return {
      orderTotal,
      orderPaid: parseFloat(order.orderPaid || 0),
      orderDue,
      sampleAllowed,
      threshold
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Get pending lab payments for a patient
const getPendingLabPayments = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Check if new columns exist by trying a simple query first
    let hasNewColumns = false;
    try {
      await LabTestOrder.findOne({
        where: { patientId },
        attributes: ['orderDue'],
        limit: 1
      });
      hasNewColumns = true;
    } catch (error) {
      // New columns don't exist yet, use fallback logic
      hasNewColumns = false;
    }
    
    let orders;
    
    if (hasNewColumns) {
      // Use new unified payment logic
      orders = await LabTestOrder.findAndCountAll({
        where: {
          patientId,
          [Op.or]: [
            { orderDue: { [Op.gt]: 0 } },
            { orderDue: null }
          ]
        },
        include: [
          {
            model: LabTestOrderItem,
            as: 'orderItems',
            where: {
              status: {
                [Op.in]: ['approved', 'sample_collection_scheduled', 'sample_collected', 'processing', 'results_ready']
              }
            },
            include: [
              {
                model: LabTest,
                as: 'labTest',
                attributes: ['id', 'name', 'description', 'category']
              }
            ]
          },
          {
            model: Patient,
            as: 'patient',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['firstName', 'lastName', 'email']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });
    } else {
      // Fallback to legacy logic - find orders with due amounts
      orders = await LabTestOrder.findAndCountAll({
        where: {
          patientId,
          [Op.or]: [
            { dueAmount: { [Op.gt]: 0 } },
            { dueAmount: null }
          ]
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['firstName', 'lastName', 'email']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });
      
      // Convert legacy orders to new format
      orders.rows = orders.rows.map(order => {
        const orderData = order.toJSON();
        return {
          ...orderData,
          // Map legacy fields to new unified fields
          orderTotal: orderData.totalAmount || 0,
          orderPaid: orderData.paidAmount || 0,
          orderDue: orderData.dueAmount || orderData.totalAmount || 0,
          sampleAllowed: false,
          paymentThreshold: 0.5,
          // Create mock order items from testIds JSON
          orderItems: (orderData.testIds || []).map((testId, index) => ({
            id: `legacy-${orderData.id}-${index}`,
            orderId: orderData.id,
            labTestId: testId,
            testName: `Test ${testId}`,
            unitPrice: (orderData.totalAmount || 0) / (orderData.testIds?.length || 1),
            status: orderData.status || 'ordered',
            isSelected: true,
            sampleAllowed: false,
            labTest: {
              id: testId,
              name: `Test ${testId}`,
              description: 'Legacy test',
              category: 'General'
            }
          }))
        };
      });
    }
    
    // Calculate totals for each order (only if new columns exist)
    const ordersWithTotals = hasNewColumns 
      ? await Promise.all(
          orders.rows.map(async (order) => {
            try {
              const totals = await recalculateOrderTotals(order.id);
              return {
                ...order.toJSON(),
                ...totals
              };
            } catch (error) {
              // If recalculation fails, return order as-is
              return order.toJSON();
            }
          })
        )
      : orders.rows.map(order => order.toJSON());
    
    res.json({
      success: true,
      data: {
        orders: ordersWithTotals,
        pagination: {
          totalItems: orders.count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(orders.count / parseInt(limit)),
          itemsPerPage: parseInt(limit)
        },
        migrationStatus: hasNewColumns ? 'migrated' : 'legacy'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create batch payment for multiple orders/items
const createBatchPayment = async (req, res, next) => {
  const transaction = await LabOrderPayment.sequelize.transaction();
  
  try {
    const { patientId } = req.params;
    const { 
      paymentMethod, 
      amount, 
      target, 
      idempotencyKey,
      notes 
    } = req.body;
    
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    // Check for duplicate payment using idempotency key
    const existingPayment = await LabOrderPayment.findOne({
      where: { paymentReference: idempotencyKey },
      transaction
    });
    
    if (existingPayment) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Payment already exists with this reference',
        data: { payment: existingPayment }
      });
    }
    
    // Create payment record
    const payment = await LabOrderPayment.create({
      paymentReference: idempotencyKey,
      patientId,
      appliedAmount: parseFloat(amount),
      appliedToOrders: target,
      paymentMethod,
      status: 'pending',
      createdBy: req.user.id,
      notes
    }, { transaction });
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: { payment }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Process payment allocation after successful payment
const processPaymentAllocation = async (paymentId, transactionId = null) => {
  const transaction = await LabOrderPayment.sequelize.transaction();
  
  try {
    const payment = await LabOrderPayment.findByPk(paymentId, {
      include: [
        {
          model: Patient,
          as: 'patient'
        }
      ],
      transaction
    });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.status !== 'pending') {
      throw new Error('Payment already processed');
    }
    
    // Update payment status
    await payment.update({
      status: 'completed',
      transactionId,
      completedAt: new Date()
    }, { transaction });
    
    const { appliedToOrders, appliedAmount } = payment;
    let remainingAmount = parseFloat(appliedAmount);
    
    // Process allocation based on target
    if (appliedToOrders.orders && appliedToOrders.orders.length > 0) {
      // Allocate to specific orders
      for (const orderId of appliedToOrders.orders) {
        if (remainingAmount <= 0) break;
        
        const order = await LabTestOrder.findByPk(orderId, {
          include: [
            {
              model: LabTestOrderItem,
              as: 'orderItems',
              where: { 
                isSelected: true,
                status: 'ordered'
              }
            }
          ],
          transaction
        });
        
        if (!order) continue;
        
        const orderDue = parseFloat(order.orderDue || 0);
        const allocationAmount = Math.min(remainingAmount, orderDue);
        
        if (allocationAmount > 0) {
          // Create allocations for each order item
          for (const item of order.orderItems) {
            const itemAllocation = allocationAmount / order.orderItems.length;
            
            await LabOrderPaymentAllocation.create({
              paymentId: payment.id,
              orderItemId: item.id,
              appliedAmount: itemAllocation
            }, { transaction });
          }
          
          // Update order totals
          const newOrderPaid = parseFloat(order.orderPaid || 0) + allocationAmount;
          await order.update({
            orderPaid: newOrderPaid,
            orderDue: orderDue - allocationAmount
          }, { transaction });
          
          // Recalculate and update sample_allowed status
          await recalculateOrderTotals(orderId);
          
          remainingAmount -= allocationAmount;
        }
      }
    }
    
    if (appliedToOrders.items && appliedToOrders.items.length > 0) {
      // Allocate to specific items
      for (const itemId of appliedToOrders.items) {
        if (remainingAmount <= 0) break;
        
        const item = await LabTestOrderItem.findByPk(itemId, {
          include: [
            {
              model: LabTestOrder,
              as: 'order'
            }
          ],
          transaction
        });
        
        if (!item || !item.isSelected || item.status !== 'ordered') continue;
        
        const itemPrice = parseFloat(item.unitPrice);
        const allocationAmount = Math.min(remainingAmount, itemPrice);
        
        await LabOrderPaymentAllocation.create({
          paymentId: payment.id,
          orderItemId: item.id,
          appliedAmount: allocationAmount
        }, { transaction });
        
        // Update order totals
        const order = item.order;
        const newOrderPaid = parseFloat(order.orderPaid || 0) + allocationAmount;
        await order.update({
          orderPaid: newOrderPaid,
          orderDue: (parseFloat(order.orderDue || 0) - allocationAmount)
        }, { transaction });
        
        // Recalculate and update sample_allowed status
        await recalculateOrderTotals(order.id);
        
        remainingAmount -= allocationAmount;
      }
    }
    
    await transaction.commit();
    
    return {
      success: true,
      message: 'Payment allocation processed successfully',
      remainingAmount
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Toggle item selection (patient can deselect before payment)
const toggleItemSelection = async (req, res, next) => {
  const transaction = await LabTestOrderItem.sequelize.transaction();
  
  try {
    const { orderId, itemId } = req.params;
    const { isSelected } = req.body;
    
    const item = await LabTestOrderItem.findOne({
      where: {
        id: itemId,
        orderId
      },
      transaction
    });
    
    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }
    
    // Check if item can be deselected
    if (!isSelected && item.status !== 'ordered') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot deselect item that is already being processed'
      });
    }
    
    // Update item selection
    await item.update({ isSelected }, { transaction });
    
    // Recalculate order totals
    await recalculateOrderTotals(orderId);
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: `Item ${isSelected ? 'selected' : 'deselected'} successfully`,
      data: { item }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Cancel order item
const cancelOrderItem = async (req, res, next) => {
  const transaction = await LabTestOrderItem.sequelize.transaction();
  
  try {
    const { orderId, itemId } = req.params;
    const { reason, cancelledBy } = req.body;
    
    const item = await LabTestOrderItem.findOne({
      where: {
        id: itemId,
        orderId
      },
      include: [
        {
          model: LabTestOrder,
          as: 'order'
        }
      ],
      transaction
    });
    
    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }
    
    // Check if item can be cancelled
    if (['sample_collected', 'processing', 'results_ready', 'completed'].includes(item.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel item that is already being processed or completed'
      });
    }
    
    // Update item status
    const cancelStatus = cancelledBy === 'patient' ? 'cancelled_by_patient' : 'cancelled_by_admin';
    await item.update({
      status: cancelStatus,
      isSelected: false
    }, { transaction });
    
    // Recalculate order totals
    await recalculateOrderTotals(orderId);
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Item cancelled successfully',
      data: { item }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Admin batch payment processing
const processAdminBatchPayment = async (req, res, next) => {
  const transaction = await LabOrderPayment.sequelize.transaction();
  
  try {
    const { patientId } = req.params;
    const { 
      paymentMethod, 
      amount, 
      target, 
      idempotencyKey,
      notes,
      processedByAdminId 
    } = req.body;
    
    // Check for duplicate payment
    const existingPayment = await LabOrderPayment.findOne({
      where: { paymentReference: idempotencyKey },
      transaction
    });
    
    if (existingPayment) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Payment already exists with this reference',
        data: { payment: existingPayment }
      });
    }
    
    // Create payment record
    const payment = await LabOrderPayment.create({
      paymentReference: idempotencyKey,
      patientId,
      appliedAmount: parseFloat(amount),
      appliedToOrders: target,
      paymentMethod,
      status: 'completed', // Admin payments are immediately completed
      createdBy: processedByAdminId,
      notes,
      completedAt: new Date()
    }, { transaction });
    
    // Process allocation immediately for admin payments
    const allocationResult = await processPaymentAllocation(payment.id, null);
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Admin batch payment processed successfully',
      data: { 
        payment,
        allocation: allocationResult
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Approve lab test order items (Admin only)
const approveLabTestItems = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { itemIds } = req.body; // Array of item IDs to approve
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Item IDs array is required'
      });
    }

    const transaction = await LabTestOrderItem.sequelize.transaction();

    try {
      // Verify the order exists and get order items
      const order = await LabTestOrder.findByPk(orderId, {
        include: [
          {
            model: LabTestOrderItem,
            as: 'orderItems',
            where: { id: itemIds }
          }
        ],
        transaction
      });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Lab test order not found'
        });
      }

      // Update selected items to approved status
      await LabTestOrderItem.update(
        { 
          status: 'approved',
          updatedAt: new Date()
        },
        { 
          where: { 
            id: itemIds,
            orderId: orderId,
            status: 'ordered' // Only approve items that are currently ordered
          },
          transaction
        }
      );

      // Get updated items for response
      const updatedItems = await LabTestOrderItem.findAll({
        where: { id: itemIds },
        include: [
          {
            model: LabTest,
            as: 'labTest',
            attributes: ['id', 'name', 'description', 'category']
          }
        ],
        transaction
      });

      await transaction.commit();

      res.json({
        success: true,
        message: `${updatedItems.length} test item(s) approved successfully`,
        data: {
          orderId,
          approvedItems: updatedItems
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    next(error);
  }
};

// Get all pending orders for admin approval
const getPendingApprovalOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const orders = await LabTestOrder.findAndCountAll({
      where: {
        [Op.or]: [
          // Orders with items in 'ordered' status
          {
            '$orderItems.status$': 'ordered'
          }
        ]
      },
      include: [
        {
          model: LabTestOrderItem,
          as: 'orderItems',
          include: [
            {
              model: LabTest,
              as: 'labTest',
              attributes: ['id', 'name', 'description', 'category']
            }
          ]
        },
        {
          model: Patient,
          as: 'patient',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['firstName', 'lastName', 'email', 'phone']
            }
          ]
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['firstName', 'lastName', 'email'],
              required: false
            }
          ],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Filter to only show orders with pending items
    const filteredOrders = orders.rows.filter(order => 
      order.orderItems.some(item => item.status === 'ordered')
    );

    res.json({
      success: true,
      data: {
        orders: filteredOrders,
        pagination: {
          totalItems: filteredOrders.length,
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredOrders.length / parseInt(limit)),
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// Admin multi-patient batch payment processing
const processAdminMultiPatientBatchPayment = async (req, res, next) => {
  const transaction = await LabOrderPayment.sequelize.transaction();
  
  try {
    const { 
      orderIds,
      itemIds,
      appliedAmount,
      paymentMethod, 
      notes,
      isAdminPayment = true
    } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Item IDs array is required'
      });
    }

    // Generate unique payment reference
    const paymentReference = `admin-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get all orders and items to process
    const orders = await LabTestOrder.findAll({
      where: { id: orderIds },
      include: [
        {
          model: LabTestOrderItem,
          as: 'orderItems',
          where: { id: itemIds }
        },
        {
          model: Patient,
          as: 'patient',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ]
        }
      ],
      transaction
    });

    if (orders.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'No orders found'
      });
    }

    // Get all items to process
    const itemsToProcess = await LabTestOrderItem.findAll({
      where: { id: itemIds },
      include: [
        {
          model: LabTest,
          as: 'labTest',
          attributes: ['id', 'name', 'description']
        }
      ],
      transaction
    });

    // Calculate total amount for validation
    const totalItemAmount = itemsToProcess.reduce((sum, item) => sum + parseFloat(item.unitPrice), 0);
    
    if (parseFloat(appliedAmount) > totalItemAmount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Applied amount cannot exceed total item amount'
      });
    }

    // Create payment record for each patient (group by patient)
    const patientPayments = new Map();
    
    for (const item of itemsToProcess) {
      const order = orders.find(o => o.id === item.orderId);
      if (!order) continue;
      
      const patientId = order.patient.id;
      if (!patientPayments.has(patientId)) {
        patientPayments.set(patientId, {
          patientId,
          patient: order.patient,
          items: [],
          totalAmount: 0
        });
      }
      
      const patientPayment = patientPayments.get(patientId);
      patientPayment.items.push(item);
      patientPayment.totalAmount += parseFloat(item.unitPrice);
    }

    const createdPayments = [];
    
    for (const [patientId, patientPayment] of patientPayments) {
      // Create payment record
      const payment = await LabOrderPayment.create({
        paymentReference: `${paymentReference}-patient-${patientId}`,
        patientId,
        appliedAmount: patientPayment.totalAmount,
        appliedToOrders: JSON.stringify([patientId]),
        paymentMethod,
        status: 'completed',
        transactionId: `admin-${Date.now()}-${patientId}`,
        createdBy: req.user.id,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }, { transaction });

      // Create payment allocations
      for (const item of patientPayment.items) {
        await LabOrderPaymentAllocation.create({
          paymentId: payment.id,
          orderItemId: item.id,
          appliedAmount: parseFloat(item.unitPrice),
          createdAt: new Date(),
          updatedAt: new Date()
        }, { transaction });

        // Update item status to sample collection scheduled
        await LabTestOrderItem.update({
          status: 'sample_collection_scheduled',
          updatedAt: new Date()
        }, {
          where: { id: item.id },
          transaction
        });
      }

      // Recalculate order totals
      const orderIdsForPatient = [...new Set(patientPayment.items.map(item => item.orderId))];
      for (const orderId of orderIdsForPatient) {
        await recalculateOrderTotals(orderId, transaction);
      }

      createdPayments.push({
        paymentId: payment.id,
        patientId,
        patientName: `${patientPayment.patient.user.firstName} ${patientPayment.patient.user.lastName}`,
        amount: patientPayment.totalAmount,
        itemsCount: patientPayment.items.length
      });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Batch payment processed successfully for ${createdPayments.length} patient(s)`,
      data: {
        paymentReference,
        totalAmount: parseFloat(appliedAmount),
        payments: createdPayments
      }
    });

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

module.exports = {
  getPendingLabPayments,
  createBatchPayment,
  processPaymentAllocation,
  toggleItemSelection,
  cancelOrderItem,
  processAdminBatchPayment,
  processAdminMultiPatientBatchPayment,
  recalculateOrderTotals,
  getPaymentThreshold,
  approveLabTestItems,
  getPendingApprovalOrders
};
