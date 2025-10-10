# API Specification & Endpoints Documentation

## Overview

The Healthcare Web Application provides a comprehensive RESTful API built with Node.js and Express.js. The API follows REST conventions and implements proper authentication, authorization, validation, and error handling.

## Base URL

- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Validation errors (if any)
  ]
}
```

## HTTP Status Codes

- `200` - OK: Request successful
- `201` - Created: Resource created successfully
- `400` - Bad Request: Invalid request data
- `401` - Unauthorized: Authentication required
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `409` - Conflict: Resource already exists
- `422` - Unprocessable Entity: Validation errors
- `500` - Internal Server Error: Server error

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: Rate limit information in response headers

---

## API Endpoints

### 1. Authentication (`/api/auth`)

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "phone": "+8801234567890",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "address": "123 Main St, City",
  "role": "patient"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "patient"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST `/api/auth/login`
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "patient"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST `/api/auth/forgot-password`
Request password reset.

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

#### POST `/api/auth/reset-password`
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "password": "newpassword123"
}
```

#### GET `/api/auth/profile` 🔒
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "patient",
      "patientProfile": {
        "bloodType": "A+",
        "allergies": "None",
        "emergencyContact": "Jane Doe",
        "emergencyPhone": "+8801234567890"
      }
    }
  }
}
```

#### PUT `/api/auth/profile` 🔒
Update user profile.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+8801234567890",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "address": "123 Main St, City"
}
```

#### PUT `/api/auth/change-password` 🔒
Change user password.

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

---

### 2. Users (`/api/users`)

#### GET `/api/users` 🔒
Get list of users (for dropdowns, etc.).

**Query Parameters:**
- `role` (optional): Filter by user role
- `search` (optional): Search by name or email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "role": "patient"
      }
    ]
  }
}
```

#### PUT `/api/users/:userId/role` 🔒👑
Update user role (Admin only).

**Request Body:**
```json
{
  "role": "doctor"
}
```

---

### 3. Patients (`/api/patients`)

#### GET `/api/patients/profile` 🔒
Get patient profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": 1,
      "userId": 1,
      "bloodType": "A+",
      "allergies": "Peanuts, Shellfish",
      "emergencyContact": "Jane Doe",
      "emergencyPhone": "+8801234567890",
      "insuranceProvider": "Health Insurance Co",
      "insuranceNumber": "HI123456789",
      "medicalHistory": "Diabetes Type 2",
      "currentMedications": "Metformin 500mg"
    }
  }
}
```

#### PUT `/api/patients/profile` 🔒
Update patient profile.

**Request Body:**
```json
{
  "bloodType": "A+",
  "allergies": "Peanuts, Shellfish",
  "emergencyContact": "Jane Doe",
  "emergencyPhone": "+8801234567890",
  "insuranceProvider": "Health Insurance Co",
  "insuranceNumber": "HI123456789",
  "medicalHistory": "Diabetes Type 2",
  "currentMedications": "Metformin 500mg"
}
```

---

### 4. Doctors (`/api/doctors`)

#### GET `/api/doctors` 🔒
Get list of doctors.

**Query Parameters:**
- `department` (optional): Filter by department
- `search` (optional): Search by name or specialization
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "id": 1,
        "userId": 2,
        "bmdcRegistrationNumber": "BMDC12345",
        "department": "Cardiology",
        "experience": 10,
        "consultationFee": 1000.00,
        "rating": 4.5,
        "totalReviews": 25,
        "isVerified": true,
        "user": {
          "firstName": "Dr. Sarah",
          "lastName": "Smith",
          "email": "sarah.smith@example.com"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

#### GET `/api/doctors/:id` 🔒
Get doctor details by ID.

#### PUT `/api/doctors/profile` 🔒
Update doctor profile.

**Request Body:**
```json
{
  "bmdcRegistrationNumber": "BMDC12345",
  "department": "Cardiology",
  "experience": 10,
  "education": "MBBS, FCPS",
  "consultationFee": 1000.00,
  "bio": "Experienced cardiologist...",
  "hospital": "City Hospital",
  "location": "Dhaka, Bangladesh",
  "chamberTimes": {
    "monday": ["09:00-12:00", "14:00-17:00"],
    "tuesday": ["09:00-12:00", "14:00-17:00"]
  },
  "languages": ["English", "Bengali"],
  "services": ["ECG", "Echocardiography", "Stress Test"]
}
```

#### POST `/api/doctors/profile-image` 🔒
Upload doctor profile image.

**Request:** Multipart form data with `image` field.

---

### 5. Appointments (`/api/appointments`)

#### POST `/api/appointments` 🔒
Create new appointment.

**Request Body:**
```json
{
  "patientId": 1,
  "doctorId": 2,
  "appointmentDate": "2024-01-15",
  "timeBlock": "09:00-12:00",
  "type": "in_person",
  "reason": "Regular checkup",
  "symptoms": "Mild headache"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "appointment": {
      "id": 1,
      "patientId": 1,
      "doctorId": 2,
      "appointmentDate": "2024-01-15",
      "appointmentTime": "09:00:00",
      "status": "requested",
      "serialNumber": 1,
      "type": "in_person",
      "reason": "Regular checkup"
    }
  }
}
```

#### GET `/api/appointments` 🔒
Get appointments for current user.

**Query Parameters:**
- `status` (optional): Filter by status
- `date` (optional): Filter by date
- `doctorId` (optional): Filter by doctor (for patients)
- `patientId` (optional): Filter by patient (for doctors)

#### GET `/api/appointments/:id` 🔒
Get appointment details by ID.

#### PUT `/api/appointments/:id/cancel` 🔒
Cancel appointment.

#### PUT `/api/appointments/:id/reschedule` 🔒
Reschedule appointment.

**Request Body:**
```json
{
  "appointmentDate": "2024-01-16",
  "appointmentTime": "10:00:00",
  "duration": 30
}
```

#### PUT `/api/appointments/:id/approve` 🔒👨‍⚕️
Approve appointment (Doctor only).

#### PUT `/api/appointments/:id/decline` 🔒👨‍⚕️
Decline appointment (Doctor only).

#### PUT `/api/appointments/:id/start` 🔒👨‍⚕️
Start appointment (Doctor only).

#### PUT `/api/appointments/:id/complete` 🔒👨‍⚕️
Complete appointment (Doctor only).

---

### 6. Prescriptions (`/api/prescriptions`)

#### GET `/api/prescriptions/appointment/:appointmentId` 🔒
Get prescription by appointment ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "prescription": {
      "id": 1,
      "appointmentId": 1,
      "doctorId": 2,
      "patientId": 1,
      "medicines": "Paracetamol 500mg",
      "symptoms": "Fever, headache",
      "diagnosis": "Viral fever",
      "suggestions": "Rest and plenty of fluids",
      "tests": "Blood test recommended",
      "status": "completed"
    }
  }
}
```

#### POST `/api/prescriptions/appointment/:appointmentId` 🔒👨‍⚕️
Create or update prescription (Doctor only).

**Request Body:**
```json
{
  "medicines": "Paracetamol 500mg - 1 tablet every 6 hours for 5 days",
  "symptoms": "Fever, headache, body ache",
  "diagnosis": "Viral fever",
  "suggestions": "Rest, plenty of fluids, avoid cold drinks",
  "tests": "Blood test for CBC, CRP"
}
```

#### PUT `/api/prescriptions/appointment/:appointmentId/complete` 🔒👨‍⚕️
Complete prescription (Doctor only).

#### POST `/api/prescriptions/appointment/:appointmentId/test-reports` 🔒👑
Upload test reports (Admin only).

**Request:** Multipart form data with `testReports` field (multiple files).

#### GET `/api/prescriptions/appointment/:appointmentId/test-reports` 🔒
Get test reports.

#### GET `/api/prescriptions/appointment/:appointmentId/test-reports/:filename` 🔒
Download test report.

---

### 7. Lab Tests (`/api/lab-tests`)

#### GET `/api/lab-tests/tests`
Get all available lab tests.

**Response:**
```json
{
  "success": true,
  "data": {
    "tests": [
      {
        "id": 1,
        "name": "Complete Blood Count (CBC)",
        "description": "Comprehensive blood test",
        "category": "Hematology",
        "price": 500.00,
        "sampleType": "Blood",
        "preparationInstructions": "Fasting not required",
        "reportDeliveryTime": 24
      }
    ]
  }
}
```

#### GET `/api/lab-tests/categories`
Get lab test categories.

#### POST `/api/lab-tests/orders` 🔒
Create lab test order.

**Request Body:**
```json
{
  "testIds": [1, 2, 3]
}
```

#### POST `/api/lab-tests/unified-order` 🔒
Create unified lab test order.

#### GET `/api/lab-tests/orders` 🔒
Get patient lab orders.

#### POST `/api/lab-tests/orders/:orderId/payment` 🔒
Make payment for lab order.

**Request Body:**
```json
{
  "paymentMethod": "bkash",
  "amount": 1500.00
}
```

#### GET `/api/lab-tests/prescription-tests` 🔒
Get prescription lab tests.

#### POST `/api/lab-tests/prescription-tests/:testId/payment` 🔒
Process prescription lab payment.

#### GET `/api/lab-tests/patients/:patientId/lab-reports` 🔒👨‍⚕️
Get patient lab reports (Doctor access).

---

### 8. Medicine Management (`/api/medicines`)

#### GET `/api/medicines/patients/:patientId/medicines` 🔒
Get patient medicines.

**Response:**
```json
{
  "success": true,
  "data": {
    "medicines": [
      {
        "id": 1,
        "medicineName": "Paracetamol",
        "dosage": "500mg",
        "frequency": "Every 6 hours",
        "duration": 5,
        "startDate": "2024-01-15",
        "endDate": "2024-01-20",
        "isActive": true,
        "remainingQuantity": 20
      }
    ]
  }
}
```

#### POST `/api/medicines/patients/:patientId/medicines/manual` 🔒
Add manual medicine entry.

**Request Body:**
```json
{
  "medicineName": "Vitamin D",
  "dosage": "1000 IU",
  "frequency": "Once daily",
  "duration": 30,
  "instructions": "Take with food",
  "totalQuantity": 30
}
```

#### POST `/api/medicines/patients/:patientId/medicines/from-prescription` 🔒
Add medicine from prescription.

#### PUT `/api/medicines/medicines/:medicineId` 🔒
Update medicine.

#### DELETE `/api/medicines/medicines/:medicineId` 🔒
Delete medicine.

#### POST `/api/medicines/dosage/:medicineId` 🔒
Record medicine dosage.

**Request Body:**
```json
{
  "dosage": "500mg",
  "takenAt": "2024-01-15T10:00:00Z",
  "isTaken": true
}
```

#### GET `/api/medicines/patients/:patientId/reminders` 🔒
Get medicine reminders.

#### PUT `/api/medicines/reminders/:reminderId` 🔒
Update reminder.

#### GET `/api/medicines/patients/:patientId/schedule/today` 🔒
Get today's medicine schedule.

#### GET `/api/medicines/patients/:patientId/reminder-settings` 🔒
Get reminder settings.

#### POST `/api/medicines/patients/:patientId/reminder-settings` 🔒
Save reminder settings.

---

### 9. Admin Management (`/api/admin`)

#### GET `/api/admin/users` 🔒👑
Get all users (Admin only).

#### GET `/api/admin/users/:id` 🔒👑
Get user by ID (Admin only).

#### PUT `/api/admin/users/:id/status` 🔒👑
Update user status (Admin only).

#### DELETE `/api/admin/users/:id` 🔒👑
Delete user (Admin only).

#### GET `/api/admin/stats` 🔒👑
Get system statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalPatients": 120,
    "totalDoctors": 25,
    "totalAppointments": 500,
    "pendingAppointments": 15,
    "completedAppointments": 400,
    "totalLabOrders": 200,
    "pendingLabOrders": 10
  }
}
```

#### GET `/api/admin/doctors` 🔒👑
Get all doctors (Admin only).

#### GET `/api/admin/doctor-verifications` 🔒👑
Get doctor verification requests.

#### PUT `/api/admin/doctors/:id/verify` 🔒👑
Verify doctor (Admin only).

#### GET `/api/admin/patients` 🔒👑
Get all patients (Admin only).

#### GET `/api/admin/lab-orders` 🔒👑
Get all lab orders (Admin only).

#### PUT `/api/admin/lab-orders/:orderId/status` 🔒👑
Update lab order status.

#### POST `/api/admin/lab-orders/:orderId/upload-results` 🔒👑
Upload lab results.

#### GET `/api/admin/lab-tests` 🔒👑
Get all lab tests (Admin only).

#### POST `/api/admin/lab-tests` 🔒👑
Create new lab test.

#### PUT `/api/admin/lab-tests/:testId` 🔒👑
Update lab test.

#### DELETE `/api/admin/lab-tests/:testId` 🔒👑
Delete lab test.

---

### 10. Payments (`/api/bkash`)

#### POST `/api/bkash/create` 🔒
Create bKash payment.

**Request Body:**
```json
{
  "amount": 1000.00,
  "orderId": "ORDER123",
  "description": "Appointment fee"
}
```

#### POST `/api/bkash/execute` 🔒
Execute bKash payment.

#### GET `/api/bkash/query/:paymentId` 🔒
Query payment status.

#### GET `/api/bkash/user-payments` 🔒
Get user payment history.

#### POST `/api/bkash/refund/:paymentId` 🔒
Refund payment.

---

### 11. Notifications (`/api/notifications`)

#### GET `/api/notifications` 🔒
Get user notifications.

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "title": "Appointment Reminder",
        "message": "Your appointment with Dr. Smith is tomorrow at 10:00 AM",
        "type": "info",
        "isRead": false,
        "createdAt": "2024-01-14T10:00:00Z"
      }
    ]
  }
}
```

#### GET `/api/notifications/unread-count` 🔒
Get unread notification count.

#### PUT `/api/notifications/:id/read` 🔒
Mark notification as read.

#### PUT `/api/notifications/read-all` 🔒
Mark all notifications as read.

#### DELETE `/api/notifications/:id` 🔒
Delete notification.

#### POST `/api/notifications` 🔒
Create notification (Admin/System use).

---

### 12. Ratings (`/api/ratings`)

#### POST `/api/ratings` 🔒
Submit doctor rating.

**Request Body:**
```json
{
  "doctorId": 2,
  "appointmentId": 1,
  "rating": 5,
  "review": "Excellent doctor, very professional"
}
```

#### GET `/api/ratings/doctors/:doctorId` 🔒
Get doctor ratings.

#### PUT `/api/ratings/:id` 🔒
Update rating.

#### DELETE `/api/ratings/:id` 🔒
Delete rating.

---

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

#### 422 Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Authentication & Authorization

### Roles
- **Patient**: Can access patient-specific endpoints
- **Doctor**: Can access doctor-specific endpoints
- **Admin**: Can access all endpoints

### Protected Endpoints
- 🔒 = Requires authentication
- 👨‍⚕️ = Doctor role required
- 👑 = Admin role required

### Token Expiration
- **Default**: 7 days
- **Refresh**: Implement token refresh mechanism

## File Upload

### Supported File Types
- **Images**: JPG, JPEG, PNG, GIF, BMP, TIFF
- **Documents**: PDF, DOC, DOCX, TXT
- **Medical Files**: DICOM, NIfTI, medical imaging formats

### File Size Limits
- **Profile Images**: 5MB
- **Medical Reports**: 50MB
- **Lab Results**: 50MB

## Pagination

For endpoints that return lists, pagination is implemented:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "itemsPerPage": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Webhooks (Future Implementation)

### Payment Webhooks
- **bKash Payment Success**: `POST /webhooks/bkash/success`
- **bKash Payment Failed**: `POST /webhooks/bkash/failed`

### Appointment Webhooks
- **Appointment Created**: `POST /webhooks/appointments/created`
- **Appointment Updated**: `POST /webhooks/appointments/updated`

## API Versioning

Current version: **v1**

Future versions will be implemented as:
- `/api/v2/endpoint`

## Rate Limiting

- **General**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **File Upload**: 10 requests per hour

## CORS Configuration

- **Allowed Origins**: Configured via environment variables
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Authorization, Content-Type
- **Credentials**: Supported

This API specification provides comprehensive documentation for all endpoints, ensuring proper integration and usage of the Healthcare Web Application's backend services.
