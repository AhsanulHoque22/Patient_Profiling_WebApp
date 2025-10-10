# Unified Lab Payment System - Setup Guide

This guide explains how to set up and deploy the new unified lab payment system that allows batch payments, configurable thresholds, and improved payment management.

## 🎯 Overview

The unified payment system transforms the lab test workflow from individual test payments to efficient batch processing with the following key features:

- **Batch Payments**: Pay for multiple lab tests in a single transaction
- **Configurable Thresholds**: Set payment thresholds (default 50%) for sample processing authorization
- **Item Selection**: Patients can select/deselect individual tests before payment
- **Admin Management**: Bulk payment processing capabilities
- **Audit Trail**: Complete payment allocation tracking

## 🚀 Quick Setup

### Step 1: Run Database Migrations

```bash
# Navigate to server directory
cd server

# Run schema migrations
node run-migrations.js
```

This will create the new tables and add unified payment fields to existing tables.

### Step 2: Migrate Existing Data

```bash
# Run data migration to convert existing orders
node run-data-migration.js
```

This converts existing JSON `testIds` to itemized order items.

### Step 3: Restart the Server

```bash
# Restart your Node.js server to load new models
npm restart
# or
pm2 restart healthcare-server
```

### Step 4: Test the System

1. Open the frontend and navigate to **Lab Reports**
2. Click on the **Unified Payments** tab
3. Verify that existing lab orders are displayed correctly

## 📊 Database Changes

### New Tables Created

1. **`lab_test_order_items`** - Individual test items within orders
2. **`lab_order_payments`** - Batch payment records with idempotency
3. **`lab_order_payment_allocations`** - Precise payment allocation tracking
4. **`system_settings`** - System configuration (payment thresholds)

### Enhanced Existing Tables

**`lab_test_orders`** - Added unified payment fields:
- `order_total` - Total amount for all tests
- `order_paid` - Total amount paid
- `order_due` - Remaining amount due
- `payment_threshold` - Threshold for sample processing
- `sample_allowed` - Authorization flag for sample collection

## 🔧 API Endpoints

### New Unified Payment Endpoints

```
GET    /api/unified-lab-payments/patients/me/pending-lab-payments
POST   /api/unified-lab-payments/patients/me/pay-lab-orders
PUT    /api/unified-lab-payments/lab-orders/:orderId/toggle-item-selection/:itemId
POST   /api/unified-lab-payments/lab-orders/:orderId/cancel-item/:itemId
POST   /api/unified-lab-payments/admin/patients/:patientId/batch-lab-payment
```

### Backward Compatibility

All existing lab test endpoints remain functional during the transition period.

## 🎨 Frontend Changes

### New Component

- **`UnifiedLabPayment.tsx`** - Main component for batch payment interface

### Enhanced Pages

- **`LabReports.tsx`** - Added tab system with unified payments and individual reports

### Features

- **Order/Item Selection**: Checkboxes to select orders and individual tests
- **Batch Payment Modal**: Consolidated payment interface
- **Real-time Totals**: Live calculation of selected amounts
- **Payment Methods**: Support for multiple payment methods
- **Status Tracking**: Visual indicators for payment and processing status

## ⚙️ Configuration

### Payment Threshold

The default payment threshold is 50%, meaning patients need to pay at least 50% of the total amount before sample collection is authorized.

**To change the threshold:**

```sql
UPDATE system_settings 
SET setting_value = '0.75' 
WHERE setting_key = 'lab_payment_threshold_default';
```

### Per-Order Threshold Override

Individual orders can have custom thresholds:

```javascript
// When creating an order
const order = await LabTestOrder.create({
  // ... other fields
  paymentThreshold: 0.60 // 60% threshold for this order
});
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "Unknown column" errors
**Cause**: Database migrations not run
**Solution**: Run `node run-migrations.js`

#### 2. Empty unified payments tab
**Cause**: No pending orders or data migration not run
**Solution**: 
- Check if you have lab orders with due amounts
- Run `node run-data-migration.js`

#### 3. Frontend shows "Failed to load pending payments"
**Cause**: API endpoint issues or authentication problems
**Solution**:
- Check server logs for API errors
- Verify authentication token is valid
- Ensure patient profile exists

#### 4. Payment processing fails
**Cause**: Missing payment gateway configuration or invalid data
**Solution**:
- Check payment gateway settings
- Verify order and item IDs are valid
- Check database constraints

### Rollback Instructions

If you need to rollback the unified payment system:

```bash
# 1. Stop the server
pm2 stop healthcare-server

# 2. Rollback database migrations (run in reverse order)
# Note: This will lose new data, backup first!

# 3. Revert code changes
git revert <commit-hash>

# 4. Restart server
pm2 start healthcare-server
```

## 📈 Monitoring & Metrics

### Key Metrics to Monitor

1. **Payment Success Rate**: Track failed vs successful payments
2. **Batch Payment Adoption**: Monitor usage of unified vs individual payments
3. **Threshold Effectiveness**: Analyze payment completion rates
4. **Processing Time**: Track time from payment to sample authorization

### Database Queries for Monitoring

```sql
-- Payment success rate
SELECT 
  status,
  COUNT(*) as count,
  (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM lab_order_payments)) as percentage
FROM lab_order_payments 
GROUP BY status;

-- Batch vs individual payments
SELECT 
  'Batch' as type,
  COUNT(*) as count
FROM lab_order_payments
WHERE applied_to_orders IS NOT NULL
UNION ALL
SELECT 
  'Individual' as type,
  COUNT(*) as count
FROM lab_payments; -- legacy table
```

## 🔒 Security Considerations

1. **Idempotency**: All payments use unique reference keys to prevent duplicates
2. **ACID Transactions**: Database operations are wrapped in transactions
3. **Access Control**: Admin endpoints require proper authentication
4. **Audit Trail**: All payment allocations are tracked for compliance

## 📞 Support

For technical support or questions about the unified payment system:

1. Check the troubleshooting section above
2. Review server logs for error details
3. Verify database migrations completed successfully
4. Test with a fresh order to isolate issues

## 🎉 Success Criteria

The unified payment system is successfully deployed when:

- ✅ Database migrations complete without errors
- ✅ Existing data migrates correctly
- ✅ Frontend displays pending payments
- ✅ Batch payments process successfully
- ✅ Sample authorization works based on thresholds
- ✅ Admin can process bulk payments
- ✅ All existing functionality remains intact

---

**Note**: This system maintains full backward compatibility. Existing individual payment workflows will continue to work during the transition period.
