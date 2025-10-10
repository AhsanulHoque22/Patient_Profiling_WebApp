const { 
  LabTest, 
  LabTestOrder, 
  LabTestOrderItem,
  LabPayment, 
  LabOrderPayment,
  LabOrderPaymentAllocation,
  Patient, 
  Doctor, 
  User, 
  Appointment, 
  Prescription,
  SystemSetting 
} = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

// Helper function to automatically determine test status based on payment and completion
const determineAutomaticStatus = (test) => {
  // This function determines TEST PROCESSING STATUS based on logical workflow
  // Test processing statuses: ordered, approved, sample_processing, sample_taken, reported
  
  // If test has results uploaded, it's reported (regardless of payment status)
  if (test.testReports && test.testReports.length > 0) {
    return 'reported';
  }
  
  // If test is manually set to specific processing statuses, maintain them
  if (test.status && ['approved', 'sample_processing', 'sample_taken'].includes(test.status)) {
    return test.status;
  }
  
  // For prescription tests, default status should be 'ordered' until admin approves
  // This ensures proper workflow: ordered -> approved -> sample_processing -> sample_taken -> reported
  return 'ordered';
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/lab-results/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'lab-result-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Support medical reports and imaging files
    const allowedTypes = /pdf|jpg|jpeg|png|gif|bmp|tiff|tif|dcm|dicom|nii|nifti|mhd|raw|img|hdr|vti|vtp|stl|obj|ply|xyz|txt|csv|xlsx|xls|doc|docx|rtf|odt|ods|odp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype || '';
    
    // Allow common medical file types and documents
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/tif',
      'application/dicom', 'application/x-dicom', 'application/octet-stream', // DICOM files
      'application/zip', 'application/x-zip-compressed', // Compressed medical files
      'text/plain', 'text/csv',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/rtf', 'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation'
    ];
    
    const isValidMimeType = allowedMimeTypes.some(type => mimetype.includes(type));
    
    if ((mimetype && isValidMimeType) || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only medical reports and imaging files are allowed (PDF, images, DICOM, documents, etc.)'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for medical imaging files
});

// Get all available lab tests
const getAllLabTests = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    
    const whereClause = { isActive: true };
    
    if (category) {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const tests = await LabTest.findAndCountAll({
      where: whereClause,
      order: [['category', 'ASC'], ['name', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    // Group tests by category
    const groupedTests = tests.rows.reduce((acc, test) => {
      if (!acc[test.category]) {
        acc[test.category] = [];
      }
      acc[test.category].push(test);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        tests: tests.rows,
        groupedTests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(tests.count / parseInt(limit)),
          totalRecords: tests.count,
          hasNext: parseInt(page) * parseInt(limit) < tests.count,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to create order items
const createOrderItems = async (orderId, testIds, transaction = null) => {
  const tests = await LabTest.findAll({
    where: {
      id: testIds,
      isActive: true
    },
    transaction
  });

  const orderItems = [];
  let orderTotal = 0;

  for (const test of tests) {
    const orderItem = await LabTestOrderItem.create({
      orderId,
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

  return { orderItems, orderTotal };
};

// Create lab test order with unified payment support
const createLabTestOrder = async (req, res, next) => {
  const transaction = await LabTestOrder.sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const { testIds, doctorId, appointmentId, notes } = req.body;
    const patientId = req.user.patientId;
    
    // Validate test IDs
    const tests = await LabTest.findAll({
      where: { id: testIds, isActive: true },
      transaction
    });
    
    if (tests.length !== testIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Some tests are not available'
      });
    }
    
    // Get default payment threshold
    const setting = await SystemSetting.findOne({
      where: { settingKey: 'lab_payment_threshold_default' },
      transaction
    });
    const defaultThreshold = setting ? parseFloat(setting.settingValue) : 0.5;
    
    // Create lab test order with new unified payment fields
    const order = await LabTestOrder.create({
      patientId,
      doctorId: doctorId || null,
      appointmentId: appointmentId || null,
      testIds, // Keep for backward compatibility
      totalAmount: 0, // Will be calculated from order items
      paidAmount: 0,
      dueAmount: 0,
      status: 'ordered',
      paymentThreshold: defaultThreshold,
      sampleAllowed: false,
      notes
    }, { transaction });
    
    // Create order items
    const { orderItems, orderTotal } = await createOrderItems(order.id, testIds, transaction);
    
    // Update order with calculated totals
    await order.update({
      totalAmount: orderTotal,
      orderTotal: orderTotal,
      orderPaid: 0,
      orderDue: orderTotal,
      dueAmount: orderTotal
    }, { transaction });
    
    await transaction.commit();
    
    // Include test details in response
    const orderWithTests = await LabTestOrder.findByPk(order.id, {
      include: [
        {
          association: 'patient',
          include: [{ association: 'user', attributes: { exclude: ['password'] } }]
        },
        {
          association: 'doctor',
          include: [{ association: 'user', attributes: { exclude: ['password'] } }],
          required: false
        },
        {
          association: 'orderItems',
          include: [
            {
              association: 'labTest',
              attributes: ['id', 'name', 'description', 'category', 'price']
            }
          ]
        }
      ]
    });
    
    // Add test details for backward compatibility
    orderWithTests.dataValues.testDetails = tests;
    
    res.status(201).json({
      success: true,
      data: { 
        order: orderWithTests,
        orderItems 
      },
      message: 'Lab test order created successfully'
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Get patient's lab test orders
const getPatientLabOrders = async (req, res, next) => {
  try {
    // Set cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const patientId = req.user.patientId;
    const { status, page = 1, limit = 10 } = req.query;
    
    const whereClause = { patientId };
    if (status && status !== 'all' && status !== '') {
      whereClause.status = status;
    }
    
    const orders = await LabTestOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'doctor',
          include: [{ association: 'user', attributes: { exclude: ['password'] } }],
          required: false
        },
        {
          association: 'appointment',
          required: false
        },
        {
          association: 'payments'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    // Add test details and payment status to each order
    for (let order of orders.rows) {
      const tests = await LabTest.findAll({
        where: { id: order.testIds }
      });
      order.dataValues.testDetails = tests;
      
      // Calculate payment status based on actual payments (simplified logic)
      const totalAmount = parseFloat(order.totalAmount || 0);
      const paidAmount = parseFloat(order.paidAmount || 0);
      let paymentStatus = 'not_paid';
      
      if (paidAmount >= totalAmount) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        paymentStatus = 'partially_paid';
      } else {
        paymentStatus = 'not_paid';
      }
      
      order.dataValues.paymentStatus = paymentStatus;
      
      // Test processing status is stored in order.status (ordered, approved, sample_processing, sample_taken, reported)
      // This is separate from payment status
    }
    
    res.json({
      success: true,
      data: {
        orders: orders.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(orders.count / parseInt(limit)),
          totalRecords: orders.count,
          hasNext: parseInt(page) * parseInt(limit) < orders.count,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Make payment for lab test order
const makePayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod, amount, transactionId, gatewayResponse } = req.body;
    
    const order = await LabTestOrder.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Verify patient owns this order
    if (order.patientId !== req.user.patientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Create payment record
    const payment = await LabPayment.create({
      orderId,
      paymentMethod,
      amount: parseFloat(amount),
      transactionId,
      gatewayResponse,
      status: paymentMethod.startsWith('offline') ? 'pending' : 'completed',
      paidAt: paymentMethod.startsWith('offline') ? null : new Date()
    });
    
    // Update order payment status
    const newPaidAmount = parseFloat(order.paidAmount) + parseFloat(amount);
    const newDueAmount = parseFloat(order.totalAmount) - newPaidAmount;
    
    let newStatus = order.status;
    if (newDueAmount <= 0) {
      newStatus = 'payment_completed';
    } else if (newPaidAmount > 0) {
      newStatus = 'payment_partial';
    }
    
    await order.update({
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount,
      status: newStatus,
      paymentMethod: paymentMethod.startsWith('offline') ? 'offline' : 'online'
    });
    
    res.json({
      success: true,
      data: { payment, order },
      message: 'Payment processed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all lab test orders
const getAllLabOrders = async (req, res, next) => {
  try {
    const { 
      status, 
      search, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (dateFrom && dateTo) {
      whereClause.createdAt = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      };
    }
    
    const orders = await LabTestOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'patient',
          include: [{ 
            association: 'user', 
            attributes: { exclude: ['password'] },
            where: {
              isActive: true,
              ...(search ? {
                [Op.or]: [
                  { firstName: { [Op.like]: `%${search}%` } },
                  { lastName: { [Op.like]: `%${search}%` } },
                  { email: { [Op.like]: `%${search}%` } }
                ]
              } : {})
            }
          }]
        },
        {
          association: 'doctor',
          include: [{ 
            association: 'user', 
            attributes: { exclude: ['password'] },
            where: { isActive: true }
          }],
          required: false
        },
        {
          association: 'payments'
        },
        {
          association: 'verifier',
          attributes: { exclude: ['password'] },
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    // Add test details and payment status to each order
    for (let order of orders.rows) {
      const tests = await LabTest.findAll({
        where: { id: order.testIds }
      });
      order.dataValues.testDetails = tests;
      
      // Calculate payment status based on actual payments (simplified logic)
      const totalAmount = parseFloat(order.totalAmount || 0);
      const paidAmount = parseFloat(order.paidAmount || 0);
      let paymentStatus = 'not_paid';
      
      if (paidAmount >= totalAmount) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        paymentStatus = 'partially_paid';
      } else {
        paymentStatus = 'not_paid';
      }
      
      order.dataValues.paymentStatus = paymentStatus;
      
      // Test processing status is stored in order.status (ordered, approved, sample_processing, sample_taken, reported)
      // This is separate from payment status
    }
    
    res.json({
      success: true,
      data: {
        orders: orders.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(orders.count / parseInt(limit)),
          totalRecords: orders.count,
          hasNext: parseInt(page) * parseInt(limit) < orders.count,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update order status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, notes, sampleCollectionDate, expectedResultDate } = req.body;
    
    const order = await LabTestOrder.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const updateData = { status };
    
    if (notes) updateData.notes = notes;
    if (sampleCollectionDate) updateData.sampleCollectionDate = sampleCollectionDate;
    if (expectedResultDate) updateData.expectedResultDate = expectedResultDate;
    
    // Set verification details for specific statuses
    if (status === 'verified') {
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = req.user.id;
    }
    
    await order.update(updateData);
    
    res.json({
      success: true,
      data: { order },
      message: 'Order status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Process offline payment
const processOfflinePayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { amount, paymentMethod, notes } = req.body;
    
    const order = await LabTestOrder.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Create payment record
    const payment = await LabPayment.create({
      orderId,
      paymentMethod,
      amount: parseFloat(amount),
      status: 'completed',
      paidAt: new Date(),
      processedBy: req.user.id,
      notes
    });
    
    // Update order payment status
    const newPaidAmount = parseFloat(order.paidAmount) + parseFloat(amount);
    const newDueAmount = parseFloat(order.totalAmount) - newPaidAmount;
    
    let newStatus = order.status;
    if (newDueAmount <= 0) {
      newStatus = 'payment_completed';
    } else if (newPaidAmount > 0) {
      newStatus = 'payment_partial';
    }
    
    await order.update({
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount,
      status: newStatus,
      paymentMethod: order.paymentMethod === 'online' ? 'mixed' : 'offline'
    });
    
    res.json({
      success: true,
      data: { payment, order },
      message: 'Offline payment processed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Upload lab results (support multiple files)
const uploadLabResults = async (req, res, next) => {
  // Use array upload for multiple files, fallback to single file
  const uploadHandler = req.files ? upload.array('files', 10) : upload.single('resultFile');
  
  uploadHandler(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    try {
      const { orderId } = req.params;
      const { notes } = req.body;
      
      const order = await LabTestOrder.findByPk(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      // Check if payment is completed
      if (order.dueAmount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot upload results until payment is completed'
        });
      }
      
      let uploadedFiles = [];
      
      // Handle multiple files or single file
      if (req.files && req.files.length > 0) {
        // Multiple files uploaded
        for (const file of req.files) {
          uploadedFiles.push({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            uploadedAt: new Date().toISOString()
          });
        }
      } else if (req.file) {
        // Single file uploaded
        uploadedFiles.push({
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          uploadedAt: new Date().toISOString()
        });
      }
      
      // Store files as JSON in resultUrl field for backward compatibility
      // If testReports field exists, use it; otherwise use resultUrl
      const updateData = {
        status: 'reported',
        notes: notes || order.notes
      };
      
      // Try to use testReports field if it exists, otherwise use resultUrl
      try {
        await order.update({
          ...updateData,
          testReports: uploadedFiles,
          resultUrl: uploadedFiles.length > 0 ? `/uploads/lab-results/${uploadedFiles[0].filename}` : order.resultUrl
        });
      } catch (dbError) {
        // Fallback to resultUrl only if testReports field doesn't exist
        await order.update({
          ...updateData,
          resultUrl: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : order.resultUrl
        });
      }
      
      res.json({
        success: true,
        data: { order, uploadedFiles },
        message: `Lab results uploaded successfully (${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''})`
      });
    } catch (error) {
      next(error);
    }
  });
};

// Get lab test categories
const getLabTestCategories = async (req, res, next) => {
  try {
    const categories = await LabTest.findAll({
      attributes: ['category'],
      where: { isActive: true },
      group: ['category'],
      order: [['category', 'ASC']]
    });
    
    res.json({
      success: true,
      data: { categories: categories.map(c => c.category) }
    });
  } catch (error) {
    next(error);
  }
};

// Get prescription lab tests for patient
const getPatientPrescriptionLabTests = async (req, res, next) => {
  try {
    // Set cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const patientId = req.user.patientId;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Get all lab tests once for price lookup optimization
    const allLabTests = await LabTest.findAll({
      where: { isActive: true },
      attributes: ['name', 'price']
    });

    // Create a price lookup map for faster access
    const priceLookup = new Map();
    allLabTests.forEach(labTest => {
      const name = labTest.name.toLowerCase();
      priceLookup.set(name, labTest.price);
      
      // Add variations for better matching
      const words = name.split(' ');
      words.forEach(word => {
        if (word.length > 3) {
          priceLookup.set(word, labTest.price);
        }
      });
    });
    
    // Get prescriptions with lab tests for this patient
    const prescriptions = await Prescription.findAndCountAll({
      where: {
        patientId,
        tests: { [Op.ne]: null },
        [Op.or]: [
          { tests: { [Op.ne]: '' } },
          { tests: { [Op.ne]: '[]' } }
        ]
      },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Doctor,
              as: 'doctor',
              include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    // Process prescriptions to extract lab tests
    const labTests = [];
    
    for (const prescription of prescriptions.rows) {
      try {
        let testsData = [];
        
        // Try to parse tests as JSON
        if (prescription.tests) {
          try {
            // Clean the JSON string by removing any leading bullet points or invalid characters
            let cleanTests = prescription.tests.trim();
            
            // Check if it's actually JSON by looking for array brackets
            if (!cleanTests.startsWith('[') && !cleanTests.startsWith('{')) {
              // If it doesn't start with JSON brackets, treat as plain text
              throw new Error('Plain text format detected');
            }
            
            // Remove any leading bullet points or other invalid characters
            cleanTests = cleanTests.replace(/^[•\*\-\s]+/, '');
            
            testsData = JSON.parse(cleanTests);
          } catch (e) {
            // If not JSON, treat as string
            console.log(`Parsing prescription tests as plain text for prescription ${prescription.id}`);
            testsData = prescription.tests.split('\n').filter(test => test.trim());
            testsData = testsData.map(test => {
              // Remove bullet points and clean the test name
              const cleanName = test.replace(/^[•\*\-\s]+/, '').trim();
              return { name: cleanName, description: '', status: 'ordered', testReports: [] };
            });
          }
        }
        
        // Add each test with prescription context
        for (const test of testsData) {
          const testName = test.name || test;
          let testPrice = test.price || 0;
          let testDescription = test.description || '';
          
          // If no price is stored, try to get it from the lab test database
          if (!testPrice) {
            try {
              // Try multiple matching strategies
              let labTest = await LabTest.findOne({
                where: {
                  name: { [Op.like]: `%${testName}%` }
                }
              });
              
              // If no exact match, try reverse matching (database name contains test name)
              if (!labTest) {
                labTest = await LabTest.findOne({
                  where: {
                    name: { [Op.like]: `%${testName.replace(/\(.*?\)/g, '').trim()}%` }
                  }
                });
              }
              
              // Try keyword matching for common test variations
              if (!labTest) {
                const keywords = testName.toLowerCase().split(/[\s\(\)]+/).filter(k => k.length > 2);
                if (keywords.length > 0) {
                  const keywordConditions = keywords.map(keyword => ({
                    name: { [Op.like]: `%${keyword}%` }
                  }));
                  
                  labTest = await LabTest.findOne({
                    where: {
                      [Op.or]: keywordConditions
                    }
                  });
                }
              }
              
              // Special handling for common test name variations
              if (!labTest) {
                const testVariations = {
                  'ecg': 'electrocardiogram',
                  'ekg': 'electrocardiogram',
                  'cbc': 'cbc blood test',
                  'blood sugar': 'a1c test',
                  'diabetes': 'a1c test',
                  'hba1c': 'a1c test',
                  'chest xray': 'chest x-ray',
                  'chest x ray': 'chest x-ray',
                  'ct chest': 'chest ct',
                  'mri chest': 'chest mri',
                  'ultrasound abdomen': 'abdominal ultrasound',
                  'ct abdomen': 'abdominal ct scan',
                  'mri abdomen': 'abdominal mri scan'
                };
                
                const normalizedTestName = testName.toLowerCase().trim();
                if (testVariations[normalizedTestName]) {
                  labTest = await LabTest.findOne({
                    where: {
                      name: { [Op.like]: `%${testVariations[normalizedTestName]}%` }
                    }
                  });
                }
              }
              
              if (labTest) {
                testPrice = labTest.price || 0;
                testDescription = testDescription || labTest.description || '';
                console.log(`Found price for "${testName}": ${testPrice} from "${labTest.name}"`);
              } else {
                console.log(`No price found for test: "${testName}"`);
              }
            } catch (error) {
              console.error('Error looking up lab test price:', error);
            }
          }
          
          // Create test object for automatic status determination
          const testForStatus = {
            ...test,
            price: testPrice,
            payments: test.payments || [],
            testReports: test.testReports || []
          };
          
          // Calculate payment amounts
          const totalAmount = parseFloat(testPrice);
          const paidAmount = test.payments ? test.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
          const dueAmount = Math.max(0, totalAmount - paidAmount);
          
          // Determine test processing status first (separate from payment status)
          const testProcessingStatus = determineAutomaticStatus(testForStatus);
          
          // Determine payment status based on actual payments (simplified logic)
          let paymentStatus = 'not_paid';
          
          if (paidAmount >= totalAmount) {
            paymentStatus = 'paid';
          } else if (paidAmount > 0 && paidAmount < totalAmount) {
            paymentStatus = 'partially_paid';
          } else {
            paymentStatus = 'not_paid';
          }
          
          labTests.push({
            id: `prescription-${prescription.id}-${testName}`,
            name: testName,
            description: testDescription,
            price: testPrice,
            status: testProcessingStatus, // This is TEST PROCESSING STATUS
            type: 'prescription',
            prescriptionId: prescription.id,
            appointmentDate: prescription.appointment.appointmentDate,
            doctorName: prescription.appointment.doctor?.user ? `${prescription.appointment.doctor.user.firstName} ${prescription.appointment.doctor.user.lastName}` : 'Unknown Doctor',
            createdAt: prescription.createdAt,
            testReports: test.testReports || [],
            payments: test.payments || [],
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            dueAmount: dueAmount,
            paymentStatus: paymentStatus // This is PAYMENT STATUS (separate field)
          });
        }
      } catch (error) {
        console.error('Error processing prescription tests:', error);
      }
    }
    
    // Filter lab tests by status if specified
    let filteredLabTests = labTests;
    if (status && status !== 'all' && status !== '') {
      filteredLabTests = labTests.filter(test => test.status === status);
    }
    
    console.log('Patient prescription lab tests:', {
      total: labTests.length,
      filtered: filteredLabTests.length,
      status: status,
      statuses: [...new Set(labTests.map(test => test.status))]
    });
    
    res.json({
      success: true,
      data: {
        labTests: filteredLabTests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredLabTests.length / parseInt(limit)),
          totalRecords: filteredLabTests.length,
          hasNext: parseInt(page) * parseInt(limit) < filteredLabTests.length,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get prescription lab tests for admin
const getAllPrescriptionLabTests = async (req, res, next) => {
  try {
    const { 
      search, 
      status,
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const whereClause = {
      tests: { [Op.ne]: null },
      [Op.or]: [
        { tests: { [Op.ne]: '' } },
        { tests: { [Op.ne]: '[]' } }
      ]
    };
    
    if (dateFrom && dateTo) {
      whereClause.createdAt = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      };
    }
    
    const prescriptions = await Prescription.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Patient,
              as: 'patient',
              include: [{ 
                model: User, 
                as: 'user', 
                attributes: { exclude: ['password'] },
                where: search ? {
                  [Op.or]: [
                    { firstName: { [Op.like]: `%${search}%` } },
                    { lastName: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } }
                  ]
                } : undefined
              }]
            },
            {
              model: Doctor,
              as: 'doctor',
              include: [{ 
                model: User, 
                as: 'user', 
                attributes: ['firstName', 'lastName']
              }],
              required: false
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    // Process prescriptions to extract lab tests
    const labTests = [];
    
    for (const prescription of prescriptions.rows) {
      try {
        let testsData = [];
        
        // Try to parse tests as JSON
        if (prescription.tests) {
          try {
            // Clean the JSON string by removing any leading bullet points or invalid characters
            let cleanTests = prescription.tests.trim();
            
            // Check if it's actually JSON by looking for array brackets
            if (!cleanTests.startsWith('[') && !cleanTests.startsWith('{')) {
              // If it doesn't start with JSON brackets, treat as plain text
              throw new Error('Plain text format detected');
            }
            
            // Remove any leading bullet points or other invalid characters
            cleanTests = cleanTests.replace(/^[•\*\-\s]+/, '');
            
            testsData = JSON.parse(cleanTests);
          } catch (e) {
            // If not JSON, treat as string
            console.log(`Parsing prescription tests as plain text for prescription ${prescription.id}`);
            testsData = prescription.tests.split('\n').filter(test => test.trim());
            testsData = testsData.map(test => {
              // Remove bullet points and clean the test name
              const cleanName = test.replace(/^[•\*\-\s]+/, '').trim();
              return { name: cleanName, description: '', status: 'ordered', testReports: [] };
            });
          }
        }
        
        // Add each test with prescription context
        for (const test of testsData) {
          const testName = test.name || test;
          let testPrice = test.price || 0;
          let testDescription = test.description || '';
          
          // If no price is stored, try to get it from the lab test database
          if (!testPrice) {
            try {
              // Try multiple matching strategies
              let labTest = await LabTest.findOne({
                where: {
                  name: { [Op.like]: `%${testName}%` }
                }
              });
              
              // If no exact match, try reverse matching (database name contains test name)
              if (!labTest) {
                labTest = await LabTest.findOne({
                  where: {
                    name: { [Op.like]: `%${testName.replace(/\(.*?\)/g, '').trim()}%` }
                  }
                });
              }
              
              // Try keyword matching for common test variations
              if (!labTest) {
                const keywords = testName.toLowerCase().split(/[\s\(\)]+/).filter(k => k.length > 2);
                if (keywords.length > 0) {
                  const keywordConditions = keywords.map(keyword => ({
                    name: { [Op.like]: `%${keyword}%` }
                  }));
                  
                  labTest = await LabTest.findOne({
                    where: {
                      [Op.or]: keywordConditions
                    }
                  });
                }
              }
              
              // Special handling for common test name variations
              if (!labTest) {
                const testVariations = {
                  'ecg': 'electrocardiogram',
                  'ekg': 'electrocardiogram',
                  'cbc': 'cbc blood test',
                  'blood sugar': 'a1c test',
                  'diabetes': 'a1c test',
                  'hba1c': 'a1c test',
                  'chest xray': 'chest x-ray',
                  'chest x ray': 'chest x-ray',
                  'ct chest': 'chest ct',
                  'mri chest': 'chest mri',
                  'ultrasound abdomen': 'abdominal ultrasound',
                  'ct abdomen': 'abdominal ct scan',
                  'mri abdomen': 'abdominal mri scan'
                };
                
                const normalizedTestName = testName.toLowerCase().trim();
                if (testVariations[normalizedTestName]) {
                  labTest = await LabTest.findOne({
                    where: {
                      name: { [Op.like]: `%${testVariations[normalizedTestName]}%` }
                    }
                  });
                }
              }
              
              if (labTest) {
                testPrice = labTest.price || 0;
                testDescription = testDescription || labTest.description || '';
                console.log(`Found price for "${testName}": ${testPrice} from "${labTest.name}"`);
              } else {
                console.log(`No price found for test: "${testName}"`);
              }
            } catch (error) {
              console.error('Error looking up lab test price:', error);
            }
          }
          
          // Debug payment data
          console.log(`Test: ${testName}, Payments:`, test.payments);
          console.log(`Payment type:`, typeof test.payments, 'Length:', test.payments?.length);
          
          // Create test object for automatic status determination
          const testForStatus = {
            ...test,
            price: testPrice,
            payments: test.payments || []
          };
          
          // Calculate payment amounts and status
          const totalAmount = parseFloat(testPrice);
          const paidAmount = test.payments ? test.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
          const dueAmount = Math.max(0, totalAmount - paidAmount);
          
          // Determine test processing status first (separate from payment status)
          const testProcessingStatus = determineAutomaticStatus(testForStatus);
          
          // Determine payment status based on actual payments (simplified logic)
          let paymentStatus = 'not_paid';
          
          if (paidAmount >= totalAmount) {
            paymentStatus = 'paid';
          } else if (paidAmount > 0 && paidAmount < totalAmount) {
            paymentStatus = 'partially_paid';
          } else {
            paymentStatus = 'not_paid';
          }
          
          labTests.push({
            id: `prescription-${prescription.id}-${testName}`,
            name: testName,
            description: testDescription,
            price: testPrice,
            status: testProcessingStatus, // This is TEST PROCESSING STATUS
            type: 'prescription',
            prescriptionId: prescription.id,
            appointmentDate: prescription.appointment.appointmentDate,
            patientName: prescription.appointment.patient?.user ? `${prescription.appointment.patient.user.firstName} ${prescription.appointment.patient.user.lastName}` : 'Unknown Patient',
            patientEmail: prescription.appointment.patient?.user?.email || 'Unknown Email',
            patientPhone: prescription.appointment.patient?.user?.phone || 'Unknown Phone',
            doctorName: prescription.appointment.doctor?.user ? `${prescription.appointment.doctor.user.firstName} ${prescription.appointment.doctor.user.lastName}` : 'Unknown Doctor',
            createdAt: prescription.createdAt,
            testReports: test.testReports || [],
            payments: test.payments || [],
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            dueAmount: dueAmount,
            paymentStatus: paymentStatus, // This is PAYMENT STATUS (separate field)
            sampleId: test.sampleId // Include sample ID from test data
          });
        }
      } catch (error) {
        console.error('Error processing prescription tests:', error);
      }
    }
    
    // Apply status filter if provided
    let filteredLabTests = labTests;
    if (status && status !== 'all' && status !== '') {
      filteredLabTests = labTests.filter(test => test.status === status);
    }
    
    res.json({
      success: true,
      data: {
        labTests: filteredLabTests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(prescriptions.count / parseInt(limit)),
          totalRecords: prescriptions.count,
          hasNext: parseInt(page) * parseInt(limit) < prescriptions.count,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Create new lab test
const createLabTest = async (req, res, next) => {
  try {
    const { name, description, category, price, sampleType, preparationInstructions, reportDeliveryTime } = req.body;
    
    const labTest = await LabTest.create({
      name,
      description,
      category,
      price: parseFloat(price),
      sampleType,
      preparationInstructions,
      reportDeliveryTime: parseInt(reportDeliveryTime),
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      data: { labTest },
      message: 'Lab test created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update lab test
const updateLabTest = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const { name, description, category, price, sampleType, preparationInstructions, reportDeliveryTime, isActive } = req.body;
    
    const labTest = await LabTest.findByPk(testId);
    if (!labTest) {
      return res.status(404).json({
        success: false,
        message: 'Lab test not found'
      });
    }
    
    await labTest.update({
      name: name || labTest.name,
      description: description || labTest.description,
      category: category || labTest.category,
      price: price ? parseFloat(price) : labTest.price,
      sampleType: sampleType || labTest.sampleType,
      preparationInstructions: preparationInstructions || labTest.preparationInstructions,
      reportDeliveryTime: reportDeliveryTime ? parseInt(reportDeliveryTime) : labTest.reportDeliveryTime,
      isActive: isActive !== undefined ? isActive : labTest.isActive
    });
    
    res.json({
      success: true,
      data: { labTest },
      message: 'Lab test updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete lab test
const deleteLabTest = async (req, res, next) => {
  try {
    const { testId } = req.params;
    
    const labTest = await LabTest.findByPk(testId);
    if (!labTest) {
      return res.status(404).json({
        success: false,
        message: 'Lab test not found'
      });
    }
    
    // Check if test is used in any orders
    const ordersWithTest = await LabTestOrder.findAll({
      where: {
        testIds: {
          [Op.contains]: [parseInt(testId)]
        }
      }
    });
    
    if (ordersWithTest.length > 0) {
      // Soft delete - mark as inactive
      await labTest.update({ isActive: false });
      res.json({
        success: true,
        message: 'Lab test marked as inactive (cannot delete as it is used in orders)'
      });
    } else {
      // Hard delete
      await labTest.destroy();
      res.json({
        success: true,
        message: 'Lab test deleted successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Admin: Get all lab tests for management
const getAllLabTestsForAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, search, isActive } = req.query;
    
    const whereClause = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }
    
    const tests = await LabTest.findAndCountAll({
      where: whereClause,
      order: [['category', 'ASC'], ['name', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    // Get all unique categories for the filter
    const allCategories = await LabTest.findAll({
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']]
    });
    
    // Group tests by category
    const groupedTests = tests.rows.reduce((acc, test) => {
      if (!acc[test.category]) {
        acc[test.category] = [];
      }
      acc[test.category].push(test);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        tests: tests.rows,
        groupedTests,
        categories: allCategories.map(cat => cat.category),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(tests.count / parseInt(limit)),
          totalRecords: tests.count,
          hasNext: parseInt(page) * parseInt(limit) < tests.count,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Approve prescription lab test
const approvePrescriptionLabTest = async (req, res, next) => {
  try {
    const { testId } = req.params;
    
    // Parse testId to extract prescription ID and test name
    const testIdParts = testId.split('-');
    if (testIdParts.length < 3 || testIdParts[0] !== 'prescription') {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format'
      });
    }
    
    const prescriptionId = parseInt(testIdParts[1]);
    const testName = testIdParts.slice(2).join('-'); // Handle test names with hyphens
    
    const prescription = await Prescription.findByPk(prescriptionId, {
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Patient,
              as: 'patient',
              include: [{ 
                model: User, 
                as: 'user', 
                attributes: ['firstName', 'lastName', 'email'] 
              }]
            },
            {
              model: Doctor,
              as: 'doctor',
              include: [{ 
                model: User, 
                as: 'user', 
                attributes: ['firstName', 'lastName'] 
              }]
            }
          ]
        }
      ]
    });
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    let tests = [];
    try {
      tests = JSON.parse(prescription.tests);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prescription format'
      });
    }
    
    // Find and update the specific test
    const testIndex = tests.findIndex(t => t.name === testName);
    if (testIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Test not found in prescription'
      });
    }
    
    // Update test status to approved
    tests[testIndex].status = 'approved';
    tests[testIndex].approvedAt = new Date().toISOString();
    tests[testIndex].approvedBy = req.user.id;
    
    // Update the prescription
    await prescription.update({
      tests: JSON.stringify(tests)
    });
    
    res.json({
      success: true,
      message: 'Test approved successfully',
      data: {
        testId,
        status: 'approved',
        prescriptionId: prescription.id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update prescription lab test status
const updatePrescriptionLabTestStatus = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const { status } = req.body;
    
    // Parse testId to extract prescription ID and test name
    // Format: prescription-{prescriptionId}-{testName}
    const testIdParts = testId.split('-');
    if (testIdParts.length < 3 || testIdParts[0] !== 'prescription') {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format'
      });
    }
    
    const prescriptionId = parseInt(testIdParts[1]);
    const testName = decodeURIComponent(testIdParts.slice(2).join('-'));
    
    // Find the specific prescription
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Patient,
              as: 'patient',
              include: [{ model: User, as: 'user' }]
            },
            {
              model: Doctor,
              as: 'doctor',
              include: [{ model: User, as: 'user' }]
            }
          ]
        }
      ]
    });
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    let testFound = null;
    let updatedTests = [];
    
    try {
      // Parse tests as JSON
      let tests;
      try {
        tests = JSON.parse(prescription.tests);
      } catch (e) {
        console.log(`Error parsing tests JSON for prescription ${prescription.id}:`, e.message);
        // Fallback to plain text parsing
        const testLines = prescription.tests.split('\n').filter(test => test.trim());
        tests = testLines.map(test => {
          const cleanName = test.replace(/^[•\*\-\s]+/, '').trim();
          return { name: cleanName, description: '', status: 'ordered', testReports: [] };
        });
      }
      const testIndex = tests.findIndex(t => t.name === testName);
      
      if (testIndex !== -1) {
        testFound = tests[testIndex];
        testFound.status = status;
        tests[testIndex] = testFound;
        updatedTests = tests;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Test not found in prescription'
        });
      }
    } catch (parseError) {
      // Handle plain text format
      if (prescription.tests && prescription.tests.includes(testName)) {
        // For plain text format, we'll update the entire tests field
        const updatedTestsText = prescription.tests.replace(
          new RegExp(`(${testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'),
          `$1 - Status: ${status}`
        );
        await prescription.update({ tests: updatedTestsText });
        
        return res.json({
          success: true,
          message: 'Test status updated successfully',
          data: {
            testId,
            status,
            prescriptionId: prescription.id
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Test not found in prescription'
        });
      }
    }
    
    // Update the prescription with the modified tests
    await prescription.update({
      tests: JSON.stringify(updatedTests)
    });
    
    res.json({
      success: true,
      message: 'Test status updated successfully',
      data: {
        testId,
        status,
        prescriptionId: prescription.id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Upload results for prescription lab test
const uploadPrescriptionLabResults = async (req, res, next) => {
  try {
    const { testId } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }
    
    // Parse testId to extract prescription ID and test name
    const testIdParts = testId.split('-');
    if (testIdParts.length < 3 || testIdParts[0] !== 'prescription') {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format'
      });
    }
    
    const prescriptionId = parseInt(testIdParts[1]);
    const testName = decodeURIComponent(testIdParts.slice(2).join('-'));
    
    // Find the specific prescription
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Patient,
              as: 'patient',
              include: [{ model: User, as: 'user' }]
            },
            {
              model: Doctor,
              as: 'doctor',
              include: [{ model: User, as: 'user' }]
            }
          ]
        }
      ]
    });
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    let testFound = null;
    let updatedTests = [];
    
    try {
      // Parse tests as JSON
      let tests;
      try {
        tests = JSON.parse(prescription.tests);
      } catch (e) {
        console.log(`Error parsing tests JSON for prescription ${prescription.id}:`, e.message);
        // Fallback to plain text parsing
        const testLines = prescription.tests.split('\n').filter(test => test.trim());
        tests = testLines.map(test => {
          const cleanName = test.replace(/^[•\*\-\s]+/, '').trim();
          return { name: cleanName, description: '', status: 'ordered', testReports: [] };
        });
      }
      const testIndex = tests.findIndex(t => t.name === testName);
      
      if (testIndex !== -1) {
        testFound = tests[testIndex];
        
        // Process uploaded files
        const uploadedFiles = [];
        for (const file of req.files) {
          uploadedFiles.push({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            uploadedAt: new Date().toISOString()
          });
        }
        
        // Update test with reports
        if (!testFound.testReports) {
          testFound.testReports = [];
        }
        testFound.testReports.push(...uploadedFiles);
        
        // Automatically determine status based on results and payments
        testFound.status = determineAutomaticStatus(testFound);
        
        tests[testIndex] = testFound;
        updatedTests = tests;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Test not found in prescription'
        });
      }
    } catch (parseError) {
      // Handle plain text format - simplified approach
      return res.status(400).json({
        success: false,
        message: 'Plain text format not supported for file uploads'
      });
    }
    
    // Update the prescription with the modified tests (files are stored at individual test level)
    await prescription.update({
      tests: JSON.stringify(updatedTests)
    });
    
    res.json({
      success: true,
      message: 'Test results uploaded successfully',
      data: {
        testId,
        filesUploaded: req.files.length,
        prescriptionId: prescription.id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Process payment for prescription lab test
const processPrescriptionLabPayment = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const { paymentMethod, amount, transactionId, notes } = req.body;
    
    // Parse testId to extract prescription ID and test name
    const testIdParts = testId.split('-');
    if (testIdParts.length < 3 || testIdParts[0] !== 'prescription') {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format'
      });
    }
    
    const prescriptionId = parseInt(testIdParts[1]);
    const testName = decodeURIComponent(testIdParts.slice(2).join('-'));
    
    // Find the specific prescription
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Patient,
              as: 'patient',
              include: [{ model: User, as: 'user' }]
            },
            {
              model: Doctor,
              as: 'doctor',
              include: [{ model: User, as: 'user' }]
            }
          ]
        }
      ]
    });
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    let testFound = null;
    let updatedTests = [];
    
    try {
      // Parse tests as JSON with improved error handling
      let cleanTests = prescription.tests.trim();
      
      // Check if it's actually JSON by looking for array brackets
      if (!cleanTests.startsWith('[') && !cleanTests.startsWith('{')) {
        throw new Error('Plain text format detected');
      }
      
      // Remove any leading bullet points or other invalid characters
      cleanTests = cleanTests.replace(/^[•\*\-\s]+/, '');
      
      let tests;
      try {
        tests = JSON.parse(cleanTests);
      } catch (e) {
        console.log(`Error parsing tests JSON for prescription ${prescription.id}:`, e.message);
        // Fallback to plain text parsing
        const testLines = cleanTests.split('\n').filter(test => test.trim());
        tests = testLines.map(test => {
          const cleanName = test.replace(/^[•\*\-\s]+/, '').trim();
          return { name: cleanName, description: '', status: 'ordered', testReports: [] };
        });
      }
      const testIndex = tests.findIndex(t => t.name === testName);
      
      if (testIndex !== -1) {
        testFound = tests[testIndex];
        
        // Update test payment status
        if (!testFound.payments) {
          testFound.payments = [];
        }
        
        const paymentData = {
          id: Date.now(),
          amount: parseFloat(amount || 0),
          paymentMethod,
          transactionId,
          status: 'completed',
          paidAt: new Date().toISOString(),
          processedBy: req.user.id,
          notes
        };
        
        console.log('Adding payment:', paymentData);
        console.log('Payment amount type:', typeof paymentData.amount, 'Value:', paymentData.amount);
        testFound.payments.push(paymentData);
        
        // Automatically determine and update test status based on payment and completion
        testFound.status = determineAutomaticStatus(testFound);
        
        tests[testIndex] = testFound;
        updatedTests = tests;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Test not found in prescription'
        });
      }
    } catch (parseError) {
      // Handle plain text format - simplified approach
      return res.status(400).json({
        success: false,
        message: 'Plain text format not supported for payments'
      });
    }
    
    // Update the prescription with the modified tests
    await prescription.update({
      tests: JSON.stringify(updatedTests)
    });
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        testId,
        paymentAmount: amount,
        paymentMethod,
        transactionId,
        prescriptionId: prescription.id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Remove individual report from lab order
const removeLabOrderReport = async (req, res, next) => {
  try {
    const { orderId, reportIndex } = req.params;
    const reportIndexNum = parseInt(reportIndex);
    
    const order = await LabTestOrder.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    let testReports = [];
    try {
      testReports = order.testReports ? JSON.parse(order.testReports) : [];
    } catch (e) {
      // Handle legacy format
      try {
        testReports = JSON.parse(order.resultUrl || '[]');
      } catch (e2) {
        testReports = [];
      }
    }
    
    if (reportIndexNum < 0 || reportIndexNum >= testReports.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report index'
      });
    }
    
    // Remove the report at the specified index
    const removedReport = testReports.splice(reportIndexNum, 1)[0];
    
    // Update the order with the modified reports
    const updateData = {
      testReports: JSON.stringify(testReports)
    };
    
    // If no reports left, update resultUrl to null
    if (testReports.length === 0) {
      updateData.resultUrl = null;
      updateData.status = 'payment_completed'; // Reset status if no reports
    } else {
      // Update resultUrl with the first remaining report
      updateData.resultUrl = `/uploads/lab-results/${testReports[0].filename}`;
    }
    
    await order.update(updateData);
    
    res.json({
      success: true,
      message: 'Report removed successfully',
      data: { order, removedReport }
    });
  } catch (error) {
    next(error);
  }
};

// Remove individual report from prescription lab test
const removePrescriptionLabTestReport = async (req, res, next) => {
  try {
    const { testId, reportIndex } = req.params;
    const reportIndexNum = parseInt(reportIndex);

    // Parse testId to extract prescription ID and test name
    // Format: prescription-{prescriptionId}-{testName}
    const decodedTestId = decodeURIComponent(testId);
    const testIdParts = decodedTestId.split('-');
    
    if (testIdParts.length < 3 || testIdParts[0] !== 'prescription') {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format'
      });
    }
    
    const prescriptionId = testIdParts[1];
    const testName = testIdParts.slice(2).join('-');

    const prescription = await Prescription.findByPk(prescriptionId, {
      include: [{
        model: Appointment,
        as: 'appointment',
        include: [
          { model: Patient, as: 'patient', include: [{ model: User, as: 'user' }] },
          { model: Doctor, as: 'doctor', include: [{ model: User, as: 'user' }] }
        ]
      }]
    });
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    // Parse tests to find the specific test
    let tests = [];
    try {
      tests = prescription.tests ? JSON.parse(prescription.tests) : [];
    } catch (e) {
      console.log(`Error parsing tests JSON for prescription ${prescription.id}:`, e.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid test data format'
      });
    }
    
    // Find the specific test
    const testIndex = tests.findIndex(t => t.name === testName);
    if (testIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Test not found in prescription'
      });
    }
    
    const test = tests[testIndex];
    
    // Check if test has reports
    if (!test.testReports || !Array.isArray(test.testReports)) {
      return res.status(400).json({
        success: false,
        message: 'No reports found for this test'
      });
    }
    
    if (reportIndexNum < 0 || reportIndexNum >= test.testReports.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report index'
      });
    }
    
    // Remove the report at the specified index
    const removedReport = test.testReports.splice(reportIndexNum, 1)[0];
    
    // Update the test status if no reports remain
    if (test.testReports.length === 0) {
      test.status = 'ordered'; // Reset to ordered if no reports
    }
    
    // Update the tests array
    tests[testIndex] = test;
    
    // Update the prescription with the modified tests
    await prescription.update({
      tests: JSON.stringify(tests)
    });
    
    // Delete the actual file from the server
    if (removedReport.path) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', removedReport.path);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Failed to delete file: ${filePath}`, err);
        } else {
          console.log(`Successfully deleted file: ${filePath}`);
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Report removed successfully',
      data: {
        prescriptionId: prescription.id,
        testName: test.name,
        remainingReports: test.testReports.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Confirm and finalize lab order reports (send to patient)
const confirmLabOrderReports = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const order = await LabTestOrder.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Lab order not found'
      });
    }

    // Check if order has reports to confirm
    if (!order.testReports || (Array.isArray(order.testReports) && order.testReports.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'No reports available to confirm'
      });
    }

    // Update status to confirmed (finalized)
    await order.update({
      status: 'confirmed'
    });

    res.json({
      success: true,
      message: 'Reports confirmed and sent to patient',
      data: {
        orderId: order.id,
        status: 'confirmed'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Revert lab order reports back to reported status (go back functionality)
const revertLabOrderReports = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const order = await LabTestOrder.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Lab order not found'
      });
    }

    // Only allow reverting from confirmed status
    if (order.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Can only revert from confirmed status'
      });
    }

    // Update status back to reported
    await order.update({
      status: 'reported'
    });

    res.json({
      success: true,
      message: 'Reports reverted back to reported status',
      data: {
        orderId: order.id,
        status: 'reported'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Revert prescription lab test reports back to reported status (go back functionality)
const revertPrescriptionLabTestReports = async (req, res, next) => {
  try {
    const { testId } = req.params;
    
    const decodedTestId = decodeURIComponent(testId);
    const testIdParts = decodedTestId.split('-');

    if (testIdParts.length < 3 || testIdParts[0] !== 'prescription') {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format'
      });
    }

    const prescriptionId = testIdParts[1];
    const testName = testIdParts.slice(2).join('-');

    const prescription = await Prescription.findByPk(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    let tests = [];
    try {
      tests = prescription.tests ? JSON.parse(prescription.tests) : [];
    } catch (e) {
      console.log(`Error parsing tests JSON for prescription ${prescription.id}:`, e.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid test data format'
      });
    }

    const testIndex = tests.findIndex(t => t.name === testName);
    if (testIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Test not found in prescription'
      });
    }

    const test = tests[testIndex];

    // Only allow reverting from confirmed status
    if (test.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Can only revert from confirmed status'
      });
    }

    // Update test status back to reported
    test.status = 'reported';
    tests[testIndex] = test;

    await prescription.update({
      tests: JSON.stringify(tests)
    });

    res.json({
      success: true,
      message: 'Test reports reverted back to reported status',
      data: {
        prescriptionId: prescription.id,
        testName: test.name,
        status: 'reported'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Confirm and finalize prescription lab test reports (send to patient)
const confirmPrescriptionLabTestReports = async (req, res, next) => {
  try {
    const { testId } = req.params;
    
    console.log('🔍 confirmPrescriptionLabTestReports called with testId:', testId);
    
    const decodedTestId = decodeURIComponent(testId);
    const testIdParts = decodedTestId.split('-');

    console.log('🔍 Decoded testId:', decodedTestId);
    console.log('🔍 TestId parts:', testIdParts);

    if (testIdParts.length < 3 || testIdParts[0] !== 'prescription') {
      console.log('❌ Invalid test ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format'
      });
    }

    const prescriptionId = testIdParts[1];
    const testName = testIdParts.slice(2).join('-');

    const prescription = await Prescription.findByPk(prescriptionId, {
      include: [{
        model: Appointment,
        as: 'appointment',
        include: [
          { model: Patient, as: 'patient', include: [{ model: User, as: 'user' }] },
          { model: Doctor, as: 'doctor', include: [{ model: User, as: 'user' }] }
        ]
      }]
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    let tests = [];
    try {
      tests = prescription.tests ? JSON.parse(prescription.tests) : [];
    } catch (e) {
      console.log(`Error parsing tests JSON for prescription ${prescription.id}:`, e.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid test data format'
      });
    }

    const testIndex = tests.findIndex(t => t.name === testName);
    if (testIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Test not found in prescription'
      });
    }

    const test = tests[testIndex];

    // Check if test has reports to confirm
    if (!test.testReports || !Array.isArray(test.testReports) || test.testReports.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No reports available to confirm for this test'
      });
    }

    // Update test status to confirmed (finalized)
    test.status = 'confirmed';
    tests[testIndex] = test;

    await prescription.update({
      tests: JSON.stringify(tests)
    });

    res.json({
      success: true,
      message: 'Test reports confirmed and sent to patient',
      data: {
        prescriptionId: prescription.id,
        testName: test.name,
        status: 'confirmed'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Generate unique sample ID with SMP- prefix and serial number
const generateSampleId = async () => {
  try {
    // Get the current date for daily reset
    const today = new Date().toISOString().split('T')[0];
    
    // Count existing sample IDs for today
    const todaySamples = await LabTestOrder.count({
      where: {
        sampleId: {
          [Op.like]: `SMP-${today.replace(/-/g, '')}-%`
        }
      }
    });
    
    // Also check prescription lab tests for sample IDs
    const prescriptions = await Prescription.findAll({
      where: {
        tests: {
          [Op.like]: `%SMP-${today.replace(/-/g, '')}-%`
        }
      }
    });
    
    let prescriptionSampleCount = 0;
    prescriptions.forEach(prescription => {
      try {
        const tests = JSON.parse(prescription.tests);
        tests.forEach(test => {
          if (test.sampleId && test.sampleId.startsWith(`SMP-${today.replace(/-/g, '')}-`)) {
            prescriptionSampleCount++;
          }
        });
      } catch (e) {
        // Ignore parsing errors
      }
    });
    
    // Generate next serial number
    const serialNumber = todaySamples + prescriptionSampleCount + 1;
    const dateString = today.replace(/-/g, ''); // YYYYMMDD format
    
    return `SMP-${dateString}-${serialNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating sample ID:', error);
    // Fallback to timestamp-based ID if database query fails
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `SMP-${timestamp}-${random}`;
  }
};

// Admin: Process payment and update status
const processPayment = async (req, res, next) => {
  try {
    const { testId, paidAmount, transactionId, paymentMethod, notes } = req.body;
    
    // Determine if it's a regular lab order or prescription lab test
    let test;
    let isPrescription = false;
    
    if (testId.startsWith('order-')) {
      // Regular lab order
      const orderId = testId.replace('order-', '');
      test = await LabTestOrder.findByPk(orderId, {
        include: [
          { association: 'patient', include: [{ association: 'user' }] },
          { association: 'payments' }
        ]
      });
      
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Lab order not found'
        });
      }
    } else if (testId.startsWith('prescription-')) {
      // Prescription lab test
      isPrescription = true;
      const decodedTestId = decodeURIComponent(testId);
      const testIdParts = decodedTestId.split('-');
      
      if (testIdParts.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Invalid test ID format'
        });
      }
      
      const prescriptionId = testIdParts[1];
      const testName = testIdParts.slice(2).join('-');
      
      const prescription = await Prescription.findByPk(prescriptionId, {
        include: [{
          model: Appointment,
          as: 'appointment',
          include: [
            { model: Patient, as: 'patient', include: [{ model: User, as: 'user' }] }
          ]
        }]
      });
      
      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: 'Prescription not found'
        });
      }
      
      let tests = [];
      try {
        tests = prescription.tests ? JSON.parse(prescription.tests) : [];
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid test data format'
        });
      }
      
      const testIndex = tests.findIndex(t => t.name === testName);
      if (testIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Test not found in prescription'
        });
      }
      
      test = tests[testIndex];
      test.prescriptionId = prescription.id;
      test.prescription = prescription;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format'
      });
    }
    
    // Calculate payment percentages
    const totalAmount = test.totalAmount || test.price || 0;
    const currentPaidAmount = test.paidAmount || 0;
    const newPaidAmount = currentPaidAmount + paidAmount;
    const paidPercentage = (newPaidAmount / totalAmount) * 100;
    
    // Determine payment status
    let paymentStatus;
    if (newPaidAmount >= totalAmount) {
      paymentStatus = 'paid';
    } else if (paidPercentage >= 50) {
      paymentStatus = 'partially_paid';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be at least 50% of total amount'
      });
    }
    
    // Create payment record
    const paymentData = {
      amount: paidAmount,
      paymentMethod,
      transactionId: transactionId || null,
      status: 'completed',
      processedBy: req.user.id,
      notes: notes || null,
      paidAt: new Date()
    };
    
    if (isPrescription) {
      // Update prescription test
      if (!test.payments) test.payments = [];
      test.payments.push(paymentData);
      test.paidAmount = newPaidAmount;
      test.paymentStatus = paymentStatus;
      
      // Update the prescription
      const prescription = test.prescription;
      let tests = [];
      try {
        tests = prescription.tests ? JSON.parse(prescription.tests) : [];
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid test data format'
        });
      }
      
      const testIndex = tests.findIndex(t => t.name === test.name);
      tests[testIndex] = test;
      
      await prescription.update({
        tests: JSON.stringify(tests)
      });
    } else {
      // Update regular lab order
      await test.update({
        paidAmount: newPaidAmount,
        paymentStatus: paymentStatus
      });
      
      // Add payment record
      await LabPayment.create({
        labTestOrderId: test.id,
        amount: paidAmount,
        paymentMethod,
        transactionId: transactionId || null,
        status: 'completed',
        processedBy: req.user.id,
        notes: notes || null
      });
    }
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        testId,
        paidAmount: newPaidAmount,
        paymentStatus,
        canProceedToSampleProcessing: paymentStatus === 'paid' || paymentStatus === 'partially_paid'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update test status to sample processing
const updateToSampleProcessing = async (req, res, next) => {
  try {
    const { testId } = req.params;
    
    let test;
    let isPrescription = false;
    let sampleId;
    
    if (testId.startsWith('order-')) {
      // Regular lab order
      const orderId = testId.replace('order-', '');
      test = await LabTestOrder.findByPk(orderId);
      
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Lab order not found'
        });
      }
      
      // Validate minimum 50% payment requirement
      const totalAmount = parseFloat(test.totalAmount || 0);
      const paidAmount = parseFloat(test.paidAmount || 0);
      const minimumRequired = totalAmount * 0.5;
      
      if (paidAmount < minimumRequired) {
        return res.status(400).json({
          success: false,
          message: `Minimum 50% payment required for sample processing. Current payment: ${paidAmount}, Required: ${minimumRequired}`
        });
      }
      
      sampleId = await generateSampleId();
      await test.update({
        status: 'sample_processing',
        sampleId: sampleId
      });
    } else if (testId.startsWith('prescription-')) {
      // Prescription lab test
      isPrescription = true;
      const decodedTestId = decodeURIComponent(testId);
      const testIdParts = decodedTestId.split('-');
      
      if (testIdParts.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Invalid test ID format'
        });
      }
      
      const prescriptionId = testIdParts[1];
      const testName = testIdParts.slice(2).join('-');
      
      const prescription = await Prescription.findByPk(prescriptionId);
      
      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: 'Prescription not found'
        });
      }
      
      let tests = [];
      try {
        tests = prescription.tests ? JSON.parse(prescription.tests) : [];
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid test data format'
        });
      }
      
      const testIndex = tests.findIndex(t => t.name === testName);
      if (testIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Test not found in prescription'
        });
      }
      
      const testData = tests[testIndex];
      
      // Check if test is approved first
      if (testData.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Test must be approved before starting sample processing'
        });
      }
      
      // Validate minimum 50% payment requirement for prescription tests
      const totalAmount = parseFloat(testData.price || 0);
      const paidAmount = testData.payments ? testData.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
      const minimumRequired = totalAmount * 0.5;
      
      if (paidAmount < minimumRequired) {
        return res.status(400).json({
          success: false,
          message: `Minimum 50% payment required for sample processing. Current payment: ${paidAmount}, Required: ${minimumRequired}`
        });
      }
      
      sampleId = await generateSampleId();
      testData.status = 'sample_processing';
      testData.sampleId = sampleId;
      tests[testIndex] = testData;
      
      await prescription.update({
        tests: JSON.stringify(tests)
      });
    }
    
    res.json({
      success: true,
      message: 'Test status updated to sample processing',
      data: {
        testId,
        status: 'sample_processing',
        sampleId
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update test status to sample taken
const updateToSampleTaken = async (req, res, next) => {
  try {
    const { testId } = req.params;
    
    if (testId.startsWith('order-')) {
      // Regular lab order
      const orderId = testId.replace('order-', '');
      const test = await LabTestOrder.findByPk(orderId);
      
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Lab order not found'
        });
      }
      
      if (test.status !== 'sample_processing') {
        return res.status(400).json({
          success: false,
          message: 'Test must be in sample processing status first'
        });
      }
      
      await test.update({
        status: 'sample_taken'
      });
    } else if (testId.startsWith('prescription-')) {
      // Prescription lab test
      const decodedTestId = decodeURIComponent(testId);
      const testIdParts = decodedTestId.split('-');
      
      if (testIdParts.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Invalid test ID format'
        });
      }
      
      const prescriptionId = testIdParts[1];
      const testName = testIdParts.slice(2).join('-');
      
      const prescription = await Prescription.findByPk(prescriptionId);
      
      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: 'Prescription not found'
        });
      }
      
      let tests = [];
      try {
        tests = prescription.tests ? JSON.parse(prescription.tests) : [];
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid test data format'
        });
      }
      
      const testIndex = tests.findIndex(t => t.name === testName);
      if (testIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Test not found in prescription'
        });
      }
      
      const testData = tests[testIndex];
      
      if (testData.status !== 'sample_processing') {
        return res.status(400).json({
          success: false,
          message: 'Test must be in sample processing status first'
        });
      }
      
      testData.status = 'sample_taken';
      tests[testIndex] = testData;
      
      await prescription.update({
        tests: JSON.stringify(tests)
      });
    }
    
    res.json({
      success: true,
      message: 'Test status updated to sample taken',
      data: {
        testId,
        status: 'sample_taken'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Record cash payment for regular lab orders
const recordCashPaymentForOrder = async (req, res, next) => {
  try {
    const { orderId, amount, notes } = req.body;
    
    const order = await LabTestOrder.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Lab order not found'
      });
    }

    // Validate amount
    const totalAmount = parseFloat(order.totalAmount || 0);
    const currentPaidAmount = parseFloat(order.paidAmount || 0);
    const remainingAmount = Math.max(0, totalAmount - currentPaidAmount); // Ensure non-negative
    const paymentAmount = parseFloat(amount);

    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    if (paymentAmount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed remaining amount of ${remainingAmount.toFixed(2)}`
      });
    }

    // Create payment record
    const payment = await LabPayment.create({
      orderId: order.id,
      amount: paymentAmount,
      paymentMethod: 'cash',
      transactionId: `CASH-${Date.now()}`,
      status: 'completed',
      paidAt: new Date(),
      processedBy: req.user.id,
      notes: notes || 'Cash payment recorded by admin'
    });

    // Update order payment status
    const newPaidAmount = currentPaidAmount + paymentAmount;
    const newDueAmount = totalAmount - newPaidAmount;
    
    let paymentStatus = 'partially_paid';
    if (newPaidAmount >= totalAmount) {
      paymentStatus = 'paid';
    }

    await order.update({
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount,
      paymentStatus: paymentStatus
    });

    res.json({
      success: true,
      message: 'Cash payment recorded successfully',
      data: {
        orderId: order.id,
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        paymentStatus,
        payment: payment
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Record cash payment for prescription lab tests
const recordCashPaymentForPrescription = async (req, res, next) => {
  try {
    const { testId, amount, notes } = req.body;
    
    const decodedTestId = decodeURIComponent(testId);
    const testIdParts = decodedTestId.split('-');
    
    if (testIdParts.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format'
      });
    }
    
    const prescriptionId = testIdParts[1];
    const testName = testIdParts.slice(2).join('-');
    
    const prescription = await Prescription.findByPk(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    let tests = [];
    try {
      tests = prescription.tests ? JSON.parse(prescription.tests) : [];
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test data format'
      });
    }
    
    const testIndex = tests.findIndex(t => t.name === testName);
    if (testIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Test not found in prescription'
      });
    }
    
    const testData = tests[testIndex];
    
    // Get test price from lab_tests table if not stored in testData
    let testPrice = testData.price || 0;
    if (!testPrice) {
      try {
        // Try multiple lookup strategies for better matching
        let labTest = await LabTest.findOne({
          where: {
            name: { [Op.like]: `%${testName}%` }
          }
        });
        
        // If no exact match, try with cleaned test name
        if (!labTest) {
          const cleanedTestName = testName.replace(/\(.*?\)/g, '').trim();
          labTest = await LabTest.findOne({
            where: {
              name: { [Op.like]: `%${cleanedTestName}%` }
            }
          });
        }
        
        // If still no match, try with individual words
        if (!labTest) {
          const words = testName.split(' ').filter(word => word.length > 2);
          for (const word of words) {
            labTest = await LabTest.findOne({
              where: {
                name: { [Op.like]: `%${word}%` }
              }
            });
            if (labTest) break;
          }
        }
        
        if (labTest) {
          testPrice = labTest.price;
          console.log(`Found price for "${testName}": ${testPrice} from "${labTest.name}"`);
        } else {
          console.log(`No price found for test: "${testName}"`);
        }
      } catch (e) {
        console.log('Error fetching lab test price:', e.message);
      }
    }

    // Validate amount
    const totalAmount = parseFloat(testPrice || 0);
    const currentPaidAmount = testData.payments ? testData.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
    const remainingAmount = Math.max(0, totalAmount - currentPaidAmount); // Ensure non-negative
    const paymentAmount = parseFloat(amount);

    console.log('Backend Cash Payment Debug:', {
      testName: testName,
      testDataPrice: testData.price,
      labTestPrice: testPrice,
      totalAmount,
      currentPaidAmount,
      remainingAmount,
      paymentAmount,
      payments: testData.payments,
      paymentsType: typeof testData.payments,
      paymentsLength: testData.payments ? testData.payments.length : 'undefined'
    });

    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    if (paymentAmount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed remaining amount of ${remainingAmount.toFixed(2)}`
      });
    }

    // Create payment record
    const payment = {
      id: Date.now(),
      amount: paymentAmount,
      paymentMethod: 'cash',
      transactionId: `CASH-${Date.now()}`,
      status: 'completed',
      paidAt: new Date().toISOString(),
      processedBy: req.user.id,
      notes: notes || 'Cash payment recorded by admin'
    };

    // Update test data
    if (!testData.payments) {
      testData.payments = [];
    }
    testData.payments.push(payment);
    
    // Ensure test data has the correct price
    if (!testData.price || testData.price === 0) {
      testData.price = testPrice;
    }
    
    const newPaidAmount = currentPaidAmount + paymentAmount;
    let paymentStatus = 'partially_paid';
    if (newPaidAmount >= totalAmount) {
      paymentStatus = 'paid';
    }
    
    testData.paymentStatus = paymentStatus;
    tests[testIndex] = testData;
    
    await prescription.update({
      tests: JSON.stringify(tests)
    });

    // Synchronize unified order payments if this test is part of a unified order
    try {
      // Find any unified orders that might contain this test
      const unifiedOrders = await LabTestOrder.findAll({
        where: {
          appointmentId: prescription.appointmentId,
          doctorId: prescription.doctorId,
          patientId: prescription.patientId
        },
        include: [{
          association: 'orderItems',
          where: {
            testName: { [Op.like]: `%${testName}%` }
          }
        }]
      });

      // Synchronize payments for each matching unified order
      for (const unifiedOrder of unifiedOrders) {
        await synchronizeUnifiedOrderPayments(unifiedOrder.id);
      }
    } catch (syncError) {
      console.error('Error synchronizing unified order payments:', syncError.message);
      // Don't fail the main operation if synchronization fails
    }

    res.json({
      success: true,
      message: 'Cash payment recorded successfully',
      data: {
        testId,
        paidAmount: newPaidAmount,
        dueAmount: totalAmount - newPaidAmount,
        paymentStatus,
        payment: payment
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get specific patient's lab reports for doctors
const getPatientLabReportsForDoctor = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { status, page = 1, limit = 50 } = req.query;
    
    console.log('🔍 NEW CODE: Getting lab reports for patient:', patientId, 'with status:', status);
    console.log('🔍 This is the UPDATED version of the code WITHOUT testReports association');
    
    const whereClause = { patientId: parseInt(patientId) };
    if (status && status !== 'all' && status !== '') {
      whereClause.status = status;
    }
    
    // Get lab test orders WITHOUT testReports association (it's a JSON field, not an association)
    const orders = await LabTestOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'doctor',
          include: [{ association: 'user', attributes: { exclude: ['password'] } }],
          required: false
        },
        {
          association: 'appointment',
          required: false
        },
        {
          association: 'payments'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    // Add test details to each order
    for (let order of orders.rows) {
      const tests = await LabTest.findAll({
        where: { id: order.testIds }
      });
      order.dataValues.testDetails = tests;
    }
    
    console.log('Found lab orders:', orders.count, 'for patient:', patientId);
    console.log('Orders data:', orders.rows.map(o => ({ 
      id: o.id, 
      status: o.status, 
      testIds: o.testIds,
      testReports: o.testReports,
      testReportsType: typeof o.testReports,
      testReportsLength: Array.isArray(o.testReports) ? o.testReports.length : 'not array',
      hasTestReports: o.testReports && Array.isArray(o.testReports) && o.testReports.length > 0
    })));
    
    res.json({
      success: true,
      data: {
        orders: orders.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(orders.count / parseInt(limit)),
          totalRecords: orders.count,
          hasNext: parseInt(page) * parseInt(limit) < orders.count,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get specific patient's prescription lab tests for doctors
const getPatientPrescriptionLabTestsForDoctor = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { status, page = 1, limit = 50 } = req.query;
    
    console.log('Getting prescription lab tests for patient:', patientId, 'with status:', status);
    
    // Get all lab tests once for price lookup optimization
    const allLabTests = await LabTest.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'price', 'category']
    });
    
    // Create price lookup map
    const priceLookup = new Map();
    allLabTests.forEach(labTest => {
      priceLookup.set(labTest.id, labTest.price);
      // Also create lookup by name for prescription tests
      const nameWords = labTest.name.toLowerCase().split(' ');
      nameWords.forEach(word => {
        if (word.length > 2) {
          priceLookup.set(word, labTest.price);
        }
      });
    });
    
    // Get prescriptions with lab tests for this patient
    const prescriptions = await Prescription.findAndCountAll({
      where: {
        patientId: parseInt(patientId),
        tests: { [Op.ne]: null },
        [Op.or]: [
          { tests: { [Op.ne]: '' } },
          { tests: { [Op.ne]: '[]' } }
        ]
      },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Doctor,
              as: 'doctor',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['firstName', 'lastName']
                }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    // Process prescriptions to add test details and filter by status
    const processedPrescriptions = [];
    for (let prescription of prescriptions.rows) {
      try {
        const parsedTests = JSON.parse(prescription.tests || '[]');
        const filteredTests = parsedTests.filter(test => 
          !status || status === 'all' || test.status === status
        );
        
        console.log('Prescription', prescription.id, 'has tests:', parsedTests.length, 'filtered:', filteredTests.length);
        
        if (filteredTests.length > 0) {
          // Add additional information to each test
          const enhancedTests = filteredTests.map(test => ({
            ...test,
            takenDate: prescription.createdAt, // Date when prescription was created
            prescriptionId: prescription.id,
            appointmentDate: prescription.appointment?.appointmentDate,
            // Preserve testReports data for result files
            resultFiles: test.testReports || []
          }));
          
          prescription.dataValues.parsedTests = enhancedTests;
          processedPrescriptions.push(prescription);
        }
      } catch (parseError) {
        console.error('Error parsing prescription tests:', parseError);
      }
    }
    
    console.log('Found prescription lab tests:', processedPrescriptions.length, 'for patient:', patientId);
    
    // Debug logging to show testReports data
    console.log('🔍 DEBUG: Prescription lab tests with resultFiles:');
    processedPrescriptions.forEach(prescription => {
      console.log(`Prescription ${prescription.id}:`, prescription.dataValues.parsedTests?.map(test => ({
        name: test.name,
        status: test.status,
        resultFiles: test.resultFiles,
        hasResultFiles: test.resultFiles && test.resultFiles.length > 0
      })));
    });
    
    res.json({
      success: true,
      data: {
        prescriptions: processedPrescriptions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(processedPrescriptions.length / parseInt(limit)),
          totalRecords: processedPrescriptions.length,
          hasNext: parseInt(page) * parseInt(limit) < processedPrescriptions.length,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLabTests,
  createLabTestOrder,
  getPatientLabOrders,
  makePayment,
  getAllLabOrders,
  updateOrderStatus,
  processOfflinePayment,
  uploadLabResults,
  removeLabOrderReport,
  getLabTestCategories,
  getPatientPrescriptionLabTests,
  getAllPrescriptionLabTests,
  approvePrescriptionLabTest,
  updatePrescriptionLabTestStatus,
  uploadPrescriptionLabResults,
  removePrescriptionLabTestReport,
  processPrescriptionLabPayment,
  confirmLabOrderReports,
  confirmPrescriptionLabTestReports,
  revertLabOrderReports,
  revertPrescriptionLabTestReports,
  createLabTest,
  updateLabTest,
  deleteLabTest,
  getAllLabTestsForAdmin,
  processPayment,
  updateToSampleProcessing,
  updateToSampleTaken,
  recordCashPaymentForOrder,
  recordCashPaymentForPrescription,
  getPatientLabReportsForDoctor,
  getPatientPrescriptionLabTestsForDoctor
};

// Record cash payment for unified order
const recordUnifiedOrderCashPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { amount, notes } = req.body;

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    const transaction = await LabTestOrder.sequelize.transaction();

    try {
      const order = await LabTestOrder.findByPk(orderId, {
        include: [{ association: 'orderItems' }],
        transaction
      });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Calculate actual payment status
      const paymentStatus = await calculateUnifiedOrderPaymentStatus(order);
      
      // Check if payment exceeds remaining amount
      if (paymentAmount > paymentStatus.dueAmount) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Payment amount cannot exceed remaining amount of ${paymentStatus.dueAmount.toFixed(2)}`
        });
      }

      console.log(`Recording cash payment for unified order ${orderId}:`, {
        paymentAmount,
        currentPaidAmount: paymentStatus.paidAmount,
        currentDueAmount: paymentStatus.dueAmount,
        totalAmount: paymentStatus.totalAmount
      });

      // Update the unified order payment totals
      const newPaidAmount = paymentStatus.paidAmount + paymentAmount;
      const newDueAmount = Math.max(0, paymentStatus.totalAmount - newPaidAmount);

      await order.update({
        orderPaid: newPaidAmount,
        orderDue: newDueAmount
      }, { transaction });

      // Record payment in prescription tests for individual test tracking
      try {
        const prescription = await Prescription.findOne({
          where: {
            appointmentId: order.appointmentId,
            doctorId: order.doctorId,
            patientId: order.patientId
          },
          transaction
        });

        if (prescription) {
          let testsData = [];
          try {
            testsData = prescription.tests ? JSON.parse(prescription.tests) : [];
          } catch (e) {
            console.log('Error parsing prescription tests for unified payment:', e.message);
          }

          // Distribute payment across unpaid tests
          let remainingPayment = paymentAmount;
          for (const orderItem of order.orderItems) {
            if (remainingPayment <= 0) break;

            const testName = orderItem.testName;
            const testIndex = testsData.findIndex(test => {
              const testNameToMatch = test.name || test;
              return testNameToMatch.toLowerCase().includes(testName.toLowerCase()) ||
                     testName.toLowerCase().includes(testNameToMatch.toLowerCase());
            });

            if (testIndex !== -1) {
              const test = testsData[testIndex];
              const testPrice = test.price || orderItem.unitPrice || 0;
              const currentPaidAmount = test.payments ? test.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
              const testDueAmount = Math.max(0, testPrice - currentPaidAmount);
              
              if (testDueAmount > 0) {
                const paymentForThisTest = Math.min(remainingPayment, testDueAmount);
                
                // Initialize payments array if it doesn't exist
                if (!test.payments) test.payments = [];
                
                // Add payment record
                test.payments.push({
                  amount: paymentForThisTest,
                  method: 'cash',
                  recordedBy: req.user.id,
                  recordedAt: new Date().toISOString(),
                  notes: notes || 'Unified order cash payment'
                });

                remainingPayment -= paymentForThisTest;
                testsData[testIndex] = test;
              }
            }
          }

          // Update prescription with modified test data
          await prescription.update({
            tests: JSON.stringify(testsData)
          }, { transaction });
        }
      } catch (prescriptionError) {
        console.error('Error updating prescription payments:', prescriptionError.message);
        // Don't fail the main operation if prescription update fails
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Cash payment recorded successfully',
        data: {
          orderId,
          paymentAmount,
          newPaidAmount,
          newDueAmount,
          paymentStatus: newPaidAmount >= paymentStatus.totalAmount ? 'paid' : 'partially_paid'
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

// Upload results for unified order
const uploadUnifiedOrderResults = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const files = req.files;
    const notes = req.body.notes;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const transaction = await LabTestOrder.sequelize.transaction();

    try {
      const order = await LabTestOrder.findByPk(orderId, { transaction });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if full payment is made
      const paymentStatus = await calculateUnifiedOrderPaymentStatus(order);
      if (paymentStatus.paidAmount < paymentStatus.totalAmount) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Full payment required to upload results'
        });
      }

      // Process uploaded files
      const uploadedFiles = [];
      for (const file of files) {
        const fileData = {
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
          uploadedBy: req.user.id,
          notes: notes || ''
        };
        uploadedFiles.push(fileData);
      }

      // Update order with uploaded results
      await order.update({
        status: 'results_ready',
        testReports: JSON.stringify(uploadedFiles),
        resultUrl: uploadedFiles.length > 0 ? uploadedFiles[0].path : null
      }, { transaction });

      // Update individual order items status
      await LabTestOrderItem.update(
        { status: 'results_ready' },
        { 
          where: { order_id: orderId },
          transaction 
        }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: 'Results uploaded successfully',
        data: {
          orderId,
          filesUploaded: uploadedFiles.length,
          status: 'results_ready'
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

// Confirm unified order reports
const confirmUnifiedOrderReports = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const transaction = await LabTestOrder.sequelize.transaction();

    try {
      const order = await LabTestOrder.findByPk(orderId, { transaction });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.status !== 'results_ready') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Order must be in results_ready status to confirm'
        });
      }

      // Update order status to completed
      await order.update({
        status: 'completed'
      }, { transaction });

      // Update individual order items status
      await LabTestOrderItem.update(
        { status: 'completed' },
        { 
          where: { order_id: orderId },
          transaction 
        }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: 'Reports confirmed successfully',
        data: {
          orderId,
          status: 'completed'
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

// Revert unified order reports
const revertUnifiedOrderReports = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const transaction = await LabTestOrder.sequelize.transaction();

    try {
      const order = await LabTestOrder.findByPk(orderId, { transaction });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (!['results_ready', 'completed'].includes(order.status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Order must have results to revert'
        });
      }

      // Revert order status to processing
      await order.update({
        status: 'processing',
        testReports: null,
        resultUrl: null
      }, { transaction });

      // Update individual order items status
      await LabTestOrderItem.update(
        { status: 'processing' },
        { 
          where: { order_id: orderId },
          transaction 
        }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: 'Reports reverted successfully',
        data: {
          orderId,
          status: 'processing'
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

// Function to synchronize unified order payments with prescription payments
const synchronizeUnifiedOrderPayments = async (orderId) => {
  try {
    const order = await LabTestOrder.findByPk(orderId, {
      include: [{ association: 'orderItems' }]
    });

    if (!order) {
      console.log(`Order ${orderId} not found for synchronization`);
      return false;
    }

    // Calculate actual payment status
    const paymentStatus = await calculateUnifiedOrderPaymentStatus(order);
    
    // Update the unified order with actual payment data
    await order.update({
      orderTotal: paymentStatus.totalAmount,
      orderPaid: paymentStatus.paidAmount,
      orderDue: paymentStatus.dueAmount
    });

    console.log(`Synchronized order ${orderId} payments:`, {
      totalAmount: paymentStatus.totalAmount,
      paidAmount: paymentStatus.paidAmount,
      dueAmount: paymentStatus.dueAmount,
      paymentStatus: paymentStatus.paymentStatus
    });

    return true;
  } catch (error) {
    console.error(`Error synchronizing order ${orderId} payments:`, error.message);
    return false;
  }
};

// Get prescription lab tests for unified selection
const getPrescriptionLabTestsForUnifiedSelection = async (req, res, next) => {
  try {
    const patientId = req.user.patientId;
    
    // Get prescriptions with lab tests for this patient
    const prescriptions = await Prescription.findAll({
      where: {
        patientId,
        tests: { [Op.ne]: null },
        [Op.or]: [
          { tests: { [Op.ne]: '' } },
          { tests: { [Op.ne]: '[]' } }
        ]
      },
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            {
              model: Doctor,
              as: 'doctor',
              include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Process prescriptions to extract lab tests with prescription context
    const prescriptionTests = [];
    
    for (const prescription of prescriptions) {
      try {
        let testsData = [];
        
        // Parse tests from prescription
        if (prescription.tests) {
          try {
            let cleanTests = prescription.tests.trim();
            
            if (!cleanTests.startsWith('[') && !cleanTests.startsWith('{')) {
              throw new Error('Plain text format detected');
            }
            
            cleanTests = cleanTests.replace(/^[•\*\-\s]+/, '');
            testsData = JSON.parse(cleanTests);
          } catch (e) {
            // If not JSON, treat as string
            testsData = prescription.tests.split('\n').filter(test => test.trim());
            testsData = testsData.map(test => {
              const cleanName = test.replace(/^[•\*\-\s]+/, '').trim();
              return { name: cleanName, description: '', status: 'ordered', testReports: [] };
            });
          }
        }
        
        // Add each test with prescription context
        for (const test of testsData) {
          const testName = test.name || test;
          let testPrice = test.price || 0;
          let testDescription = test.description || '';
          
          // Try to get price from lab test database
          let actualLabTestId = null;
          if (!testPrice) {
            try {
              let labTest = await LabTest.findOne({
                where: {
                  name: { [Op.like]: `%${testName}%` }
                }
              });
              
              if (!labTest) {
                labTest = await LabTest.findOne({
                  where: {
                    name: { [Op.like]: `%${testName.replace(/\(.*?\)/g, '').trim()}%` }
                  }
                });
              }
              
              if (labTest) {
                testPrice = labTest.price || 0;
                testDescription = testDescription || labTest.description || '';
                actualLabTestId = labTest.id; // Store the lab test ID
                console.log(`Found lab test ID ${actualLabTestId} for "${testName}"`);
              }
            } catch (error) {
              console.error('Error looking up lab test price:', error);
            }
          } else {
            // If testPrice is already set, we still need to find the lab test ID
            try {
              let labTest = await LabTest.findOne({
                where: {
                  name: { [Op.like]: `%${testName}%` }
                }
              });
              
              if (!labTest) {
                labTest = await LabTest.findOne({
                  where: {
                    name: { [Op.like]: `%${testName.replace(/\(.*?\)/g, '').trim()}%` }
                  }
                });
              }
              
              if (labTest) {
                actualLabTestId = labTest.id;
                console.log(`Found lab test ID ${actualLabTestId} for "${testName}" (price already set)`);
              }
            } catch (error) {
              console.error('Error looking up lab test ID:', error);
            }
          }
          
          // Calculate payment amounts
          const totalAmount = parseFloat(testPrice);
          const paidAmount = test.payments ? test.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0) : 0;
          const dueAmount = Math.max(0, totalAmount - paidAmount);
          
          // Determine payment status
          let paymentStatus = 'not_paid';
          if (paidAmount >= totalAmount) {
            paymentStatus = 'paid';
          } else if (paidAmount > 0 && paidAmount < totalAmount) {
            paymentStatus = 'partially_paid';
          }
          
          // Create test object for status determination
          const testForStatus = {
            ...test,
            price: testPrice,
            payments: test.payments || [],
            testReports: test.testReports || []
          };
          
          // Determine test processing status
          const testProcessingStatus = determineAutomaticStatus(testForStatus);
          
          // Only include tests that meet the criteria for unified selection:
          // Status: ordered or approved
          // Payment status: not_paid or partially_paid
          if (
            (testProcessingStatus === 'ordered' || testProcessingStatus === 'approved') &&
            (paymentStatus === 'not_paid' || paymentStatus === 'partially_paid')
          ) {

          prescriptionTests.push({
            id: `prescription-${prescription.id}-${testName.replace(/\s+/g, '-').toLowerCase()}`,
            name: testName,
            description: testDescription || `Prescribed by Dr. ${prescription.appointment.doctor.user.firstName} ${prescription.appointment.doctor.user.lastName}`,
            category: prescription.appointment.doctor.department || 'Prescription',
            price: testPrice,
            sampleType: 'Blood', // Default
            preparationInstructions: 'Follow doctor\'s instructions',
            reportDeliveryTime: 24,
            // Status information
            status: testProcessingStatus,
            paymentStatus: paymentStatus,
            paidAmount: paidAmount,
            dueAmount: dueAmount,
            // Prescription context
            prescriptionId: prescription.id,
            appointmentId: prescription.appointmentId,
            doctorId: prescription.doctorId,
            doctorName: `${prescription.appointment.doctor.user.firstName} ${prescription.appointment.doctor.user.lastName}`,
            doctorDepartment: prescription.appointment.doctor.department,
            appointmentDate: prescription.appointment.appointmentDate,
            prescriptionDate: prescription.createdAt,
            originalTest: test,
            // Lab test ID for unified order creation
            labTestId: actualLabTestId
          });
          
          console.log(`Added prescription test "${testName}" with labTestId: ${actualLabTestId}`);
          }
        }
      } catch (error) {
        console.error(`Error processing prescription ${prescription.id}:`, error);
      }
    }
    
    res.json({
      success: true,
      data: {
        tests: prescriptionTests,
        total: prescriptionTests.length
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// Get unified lab orders for admin
// Helper function to calculate actual payment status for unified orders
const calculateUnifiedOrderPaymentStatus = async (order) => {
  try {
    // Get the prescription associated with this order
    const prescription = await Prescription.findOne({
      where: {
        appointmentId: order.appointmentId,
        doctorId: order.doctorId,
        patientId: order.patientId
      }
    });

    if (!prescription) {
      console.log(`No prescription found for order ${order.id}`);
      return {
        totalAmount: order.orderTotal || 0,
        paidAmount: order.orderPaid || 0,
        dueAmount: (order.orderTotal || 0) - (order.orderPaid || 0),
        paymentStatus: order.orderPaid >= (order.orderTotal || 0) ? 'paid' : 'pending'
      };
    }

    let testsData = [];
    try {
      testsData = prescription.tests ? JSON.parse(prescription.tests) : [];
    } catch (e) {
      console.log(`Error parsing prescription tests for order ${order.id}:`, e.message);
      return {
        totalAmount: order.orderTotal || 0,
        paidAmount: order.orderPaid || 0,
        dueAmount: (order.orderTotal || 0) - (order.orderPaid || 0),
        paymentStatus: order.orderPaid >= (order.orderTotal || 0) ? 'paid' : 'pending'
      };
    }

    // Calculate actual payments from prescription tests
    let actualTotalAmount = 0;
    let actualPaidAmount = 0;

    // Match order items with prescription tests
    for (const orderItem of order.orderItems) {
      const testName = orderItem.testName;
      const testPrice = orderItem.unitPrice || 0;
      
      // Find matching test in prescription
      const prescriptionTest = testsData.find(test => {
        const testNameToMatch = test.name || test;
        return testNameToMatch.toLowerCase().includes(testName.toLowerCase()) ||
               testName.toLowerCase().includes(testNameToMatch.toLowerCase());
      });

      if (prescriptionTest) {
        actualTotalAmount += testPrice;
        
        // Calculate paid amount from prescription test payments
        if (prescriptionTest.payments && Array.isArray(prescriptionTest.payments)) {
          const testPaidAmount = prescriptionTest.payments.reduce((sum, payment) => {
            return sum + parseFloat(payment.amount || 0);
          }, 0);
          actualPaidAmount += testPaidAmount;
        }
      } else {
        // If no matching prescription test found, use order item data
        actualTotalAmount += testPrice;
        actualPaidAmount += 0; // No individual payment recorded
      }
    }

    const actualDueAmount = Math.max(0, actualTotalAmount - actualPaidAmount);
    const paymentStatus = actualPaidAmount >= actualTotalAmount ? 'paid' : 
                         actualPaidAmount > 0 ? 'partially_paid' : 'not_paid';

    console.log(`Order ${order.id} payment calculation:`, {
      orderTotal: order.orderTotal,
      orderPaid: order.orderPaid,
      actualTotalAmount,
      actualPaidAmount,
      actualDueAmount,
      paymentStatus
    });

    return {
      totalAmount: actualTotalAmount,
      paidAmount: actualPaidAmount,
      dueAmount: actualDueAmount,
      paymentStatus
    };

  } catch (error) {
    console.error(`Error calculating payment status for order ${order.id}:`, error.message);
    return {
      totalAmount: order.orderTotal || 0,
      paidAmount: order.orderPaid || 0,
      dueAmount: (order.orderTotal || 0) - (order.orderPaid || 0),
      paymentStatus: order.orderPaid >= (order.orderTotal || 0) ? 'paid' : 'pending'
    };
  }
};

const getAdminUnifiedLabOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const { count, rows: orders } = await LabTestOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'patient',
          include: [{ association: 'user', attributes: { exclude: ['password'] } }]
        },
        {
          association: 'orderItems',
          include: [
            {
              association: 'labTest',
              attributes: ['id', 'name', 'description', 'category', 'price']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Calculate actual payment status for each order
    const ordersWithActualPayments = await Promise.all(
      orders.map(async (order) => {
        const paymentStatus = await calculateUnifiedOrderPaymentStatus(order);
        
        return {
          ...order.toJSON(),
          // Override payment fields with actual calculated values
          orderTotal: paymentStatus.totalAmount,
          orderPaid: paymentStatus.paidAmount,
          orderDue: paymentStatus.dueAmount,
          paymentStatus: paymentStatus.paymentStatus,
          // Keep original values for reference
          originalOrderTotal: order.orderTotal,
          originalOrderPaid: order.orderPaid,
          originalOrderDue: order.orderDue
        };
      })
    );

    res.json({
      success: true,
      data: {
        orders: ordersWithActualPayments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// Approve unified order items
const approveUnifiedOrderItems = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Item IDs array is required'
      });
    }

    const transaction = await LabTestOrderItem.sequelize.transaction();

    try {
      // Update order items status to approved
      await LabTestOrderItem.update(
        { status: 'approved' },
        {
          where: {
            id: itemIds,
            orderId: orderId,
            status: 'ordered'
          },
          transaction
        }
      );

      // Update main order status to approved if all items are approved
      const order = await LabTestOrder.findByPk(orderId, {
        include: [{ association: 'orderItems' }],
        transaction
      });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const allItemsApproved = order.orderItems.every(item => 
        item.status === 'approved' || item.status === 'cancelled_by_patient'
      );

      if (allItemsApproved) {
        await order.update({ status: 'verified' }, { transaction });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Order items approved successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    next(error);
  }
};

// Start processing unified order (50% payment threshold)
const startUnifiedOrderProcessing = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const transaction = await LabTestOrder.sequelize.transaction();

    try {
      const order = await LabTestOrder.findByPk(orderId, {
        include: [{ association: 'orderItems' }],
        transaction
      });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order is approved
      if (order.status !== 'verified') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Order must be verified before processing'
        });
      }

      // Calculate actual payment status
      const paymentStatus = await calculateUnifiedOrderPaymentStatus(order);
      
         // Check 50% payment threshold using actual payment data
         const paymentThreshold = paymentStatus.paidAmount >= (paymentStatus.totalAmount * 0.5);
         if (!paymentThreshold) {
           await transaction.rollback();
           return res.status(400).json({
             success: false,
             message: `Payment threshold of 50% not met. Paid: ${paymentStatus.paidAmount.toFixed(2)}, Required: ${(paymentStatus.totalAmount * 0.5).toFixed(2)}`
           });
         }

      // Generate sample ID
      const sampleId = `SMP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Update order status and generate sample ID
      await order.update({
        status: 'sample_processing',
        sampleId: sampleId
      }, { transaction });

      // Update order items status to sample_processing
      await LabTestOrderItem.update(
        { 
          status: 'sample_processing',
          sampleAllowed: true
        },
        {
          where: {
            orderId: orderId,
            status: 'approved'
          },
          transaction
        }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: 'Sample processing started successfully',
        data: {
          sampleId,
          orderStatus: 'sample_processing'
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

// Create unified lab test order
const createUnifiedLabTestOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { testIds, notes, doctorId, appointmentId } = req.body;
    const patientId = req.user.patientId;

    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Test IDs array is required'
      });
    }

    const transaction = await LabTestOrder.sequelize.transaction();

    try {
      // Validate test IDs
      const tests = await LabTest.findAll({
        where: { id: testIds, isActive: true },
        transaction
      });

      if (tests.length !== testIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Some tests are not available'
        });
      }

      // Calculate total amount
      const totalAmount = tests.reduce((sum, test) => sum + parseFloat(test.price), 0);

      // Generate unique order number and barcode
      const orderNumber = `UNI-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const barcode = `${Date.now()}${Math.random().toString(36).substr(2, 8)}`;

      // Create unified lab test order
      const order = await LabTestOrder.create({
        patientId,
        testIds, // Store as JSON for backward compatibility
        totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        status: 'ordered', // Start as ordered, needs admin approval
        paymentStatus: 'not_paid',
        notes: notes || 'Unified lab test order',
        orderNumber,
        barcode,
        // New unified payment fields
        orderTotal: totalAmount,
        orderPaid: 0,
        orderDue: totalAmount,
        paymentThreshold: 0.5, // 50% threshold
        sampleAllowed: false
      }, { transaction });

      // Create order items for the new system
      for (const test of tests) {
        await LabTestOrderItem.create({
          orderId: order.id,
          labTestId: test.id,
          testName: test.name,
          unitPrice: test.price,
          status: 'ordered',
          isSelected: true,
          sampleAllowed: false
        }, { transaction });
      }

      await transaction.commit();

      // Fetch the created order with all details
      const orderWithDetails = await LabTestOrder.findByPk(order.id, {
        include: [
          {
            association: 'patient',
            include: [{ association: 'user', attributes: { exclude: ['password'] } }]
          },
          {
            association: 'orderItems',
            include: [
              {
                association: 'labTest',
                attributes: ['id', 'name', 'description', 'category', 'price']
              }
            ]
          }
        ]
      });

      res.status(201).json({
        success: true,
        data: { 
          order: orderWithDetails,
          barcode,
          orderNumber
        },
        message: 'Unified lab test order created successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Lab test catalog
  getAllLabTests,
  getLabTestCategories,
  createLabTest,
  updateLabTest,
  deleteLabTest,
  getAllLabTestsForAdmin,
  
  // Lab test orders
  createLabTestOrder,
  createUnifiedLabTestOrder,
  getPatientLabOrders,
  getAllLabOrders,
  getAdminUnifiedLabOrders,
  updateOrderStatus,
  makePayment,
  processOfflinePayment,
  
  // Unified order management
  approveUnifiedOrderItems,
  startUnifiedOrderProcessing,
  
  // Lab test results
  uploadLabResults,
  removeLabOrderReport,
  confirmLabOrderReports,
  revertLabOrderReports,
  
  // Prescription lab tests
  getPatientPrescriptionLabTests,
  getAllPrescriptionLabTests,
  approvePrescriptionLabTest,
  updatePrescriptionLabTestStatus,
  uploadPrescriptionLabResults,
  processPrescriptionLabPayment,
  removePrescriptionLabTestReport,
  confirmPrescriptionLabTestReports,
  revertPrescriptionLabTestReports,
  
  // Payment processing
  processPayment,
  updateToSampleProcessing,
  updateToSampleTaken,
  recordCashPaymentForOrder,
  recordCashPaymentForPrescription,
  
  // Doctor access
  getPatientLabReportsForDoctor,
  getPatientPrescriptionLabTestsForDoctor,

  // Prescription tests for unified selection
  getPrescriptionLabTestsForUnifiedSelection,

  // Payment synchronization
  synchronizeUnifiedOrderPayments,
  calculateUnifiedOrderPaymentStatus,

  // Unified order cash payment
  recordUnifiedOrderCashPayment,

  // Unified order results management
  uploadUnifiedOrderResults,
  confirmUnifiedOrderReports,
  revertUnifiedOrderReports
};
