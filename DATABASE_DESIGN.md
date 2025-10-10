# Database Design & ER Diagrams

## Overview

The Healthcare Web Application uses a relational database design built on MySQL 8.0 with Sequelize ORM. The database is designed to support comprehensive healthcare management including user management, appointments, medical records, prescriptions, lab tests, payments, and notifications.

## Database Schema Overview

The database consists of **21 main tables** organized into logical modules:

### Core Tables
- **Users** - Central user authentication and profile management
- **Patients** - Patient-specific medical information
- **Doctors** - Doctor profiles and professional details
- **Appointments** - Appointment scheduling and management

### Medical Records
- **Prescriptions** - Prescription management
- **Medicines** - Medicine tracking and dosage management
- **MedicineReminders** - Medicine reminder system
- **MedicineDosages** - Detailed dosage tracking
- **MedicalRecords** - General medical record storage

### Lab Management
- **LabTests** - Available lab test catalog
- **LabTestOrders** - Lab test order management
- **LabTestOrderItems** - Individual test items in orders
- **LabPayments** - Legacy payment system
- **LabOrderPayments** - Unified payment system
- **LabOrderPaymentAllocations** - Payment allocation tracking

### System Management
- **DoctorRatings** - Doctor rating and review system
- **Notifications** - System notifications
- **BkashPayments** - Payment gateway integration
- **SystemSettings** - System configuration
- **PatientReminderSettings** - Patient notification preferences

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              HEALTHCARE DATABASE ERD                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    1:1    ┌─────────────┐    1:1    ┌─────────────┐
│    Users    │◄─────────►│  Patients   │           │   Doctors   │◄─────────┐
│             │           │             │           │             │          │
│ • id (PK)   │           │ • id (PK)   │           │ • id (PK)   │          │
│ • email     │           │ • userId(FK)│           │ • userId(FK)│          │
│ • firstName │           │ • bloodType │           │ • bmdcRegNum│          │
│ • lastName  │           │ • allergies │           │ • department│          │
│ • phone     │           │ • emergency │           │ • experience│          │
│ • role      │           │ • insurance │           │ • education │          │
│ • isActive  │           │ • medHistory│           │ • rating    │          │
└─────────────┘           └─────────────┘           └─────────────┘          │
       │                           │                         │              │
       │ 1:N                      │ 1:N                     │ 1:N          │
       ▼                           ▼                         ▼              │
┌─────────────┐           ┌─────────────┐           ┌─────────────┐          │
│Notifications│           │Appointments │           │Prescriptions│          │
│             │           │             │           │             │          │
│ • id (PK)   │           │ • id (PK)   │           │ • id (PK)   │          │
│ • userId(FK)│           │ • patientId │           │ • apptId(FK)│          │
│ • title     │           │ • doctorId  │           │ • doctorId  │          │
│ • message   │           │ • date/time │           │ • patientId │          │
│ • type      │           │ • status    │           │ • medicines │          │
│ • isRead    │           │ • serialNum │           │ • diagnosis │          │
└─────────────┘           │ • type      │           └─────────────┘          │
                          │ • reason    │                   │ 1:N          │
                          └─────────────┘                   ▼              │
                                   │               ┌─────────────┐          │
                                   │ 1:N           │  Medicines  │          │
                                   ▼               │             │          │
                          ┌─────────────┐          │ • id (PK)   │          │
                          │MedicalRecords│         │ • patientId │          │
                          │             │          │ • prescId   │          │
                          │ • id (PK)   │          │ • medicine  │          │
                          │ • patientId │          │ • dosage    │          │
                          │ • doctorId  │          │ • frequency │          │
                          │ • apptId(FK)│          │ • duration  │          │
                          │ • content   │          │ • startDate │          │
                          └─────────────┘          └─────────────┘          │
                                                                           │
                          ┌─────────────┐    1:N    ┌─────────────┐          │
                          │ LabTestOrders│◄─────────►│LabTestOrderItems│      │
                          │             │           │             │          │
                          │ • id (PK)   │           │ • id (PK)   │          │
                          │ • patientId │           │ • orderId(FK)│         │
                          │ • doctorId  │           │ • testId(FK) │         │
                          │ • apptId(FK)│           │ • quantity  │          │
                          │ • status    │           │ • price     │          │
                          │ • totalAmt  │           └─────────────┘          │
                          └─────────────┘                   │              │
                                   │                        │ 1:N          │
                                   │ 1:N                    ▼              │
                                   ▼               ┌─────────────┐          │
                          ┌─────────────┐          │  LabTests   │          │
                          │LabOrderPayments│       │             │          │
                          │             │          │ • id (PK)   │          │
                          │ • id (PK)   │          │ • name      │          │
                          │ • patientId │          │ • category  │          │
                          │ • amount    │          │ • price     │          │
                          │ • status    │          │ • sampleType│          │
                          └─────────────┘          └─────────────┘          │
                                   │                                      │
                                   │ 1:N                                  │
                                   ▼                                      │
                          ┌─────────────┐                                │
                          │LabOrderPaymentAllocations│                   │
                          │             │                                │
                          │ • id (PK)   │                                │
                          │ • paymentId │                                │
                          │ • orderItemId│                               │
                          │ • amount    │                                │
                          └─────────────┘                                │
                                                                        │
                          ┌─────────────┐    1:N                        │
                          │DoctorRatings│◄───────────────────────────────┘
                          │             │
                          │ • id (PK)   │
                          │ • doctorId  │
                          │ • patientId │
                          │ • apptId(FK)│
                          │ • rating    │
                          │ • review    │
                          └─────────────┘

┌─────────────┐    1:N    ┌─────────────┐    1:N    ┌─────────────┐
│  Medicines  │◄─────────►│MedicineReminders│        │MedicineDosages│
│             │           │             │           │             │
│ • id (PK)   │           │ • id (PK)   │           │ • id (PK)   │
│ • patientId │           │ • medicineId│           │ • medicineId│
│ • prescId   │           │ • patientId │           │ • patientId │
│ • medicine  │           │ • time      │           │ • dosage    │
│ • dosage    │           │ • isActive  │           │ • takenAt   │
│ • frequency │           └─────────────┘           │ • isTaken   │
│ • duration  │                                     └─────────────┘
└─────────────┘

┌─────────────┐    1:1    ┌─────────────┐
│  Patients   │◄─────────►│PatientReminderSettings│
│             │           │             │
│ • id (PK)   │           │ • id (PK)   │
│ • userId    │           │ • patientId │
│ • bloodType │           │ • settings  │
│ • allergies │           │ • frequency │
└─────────────┘           └─────────────┘
```

## Detailed Table Specifications

### 1. Users Table
**Purpose**: Central user authentication and basic profile management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password | VARCHAR(255) | NOT NULL | Hashed password (bcrypt) |
| firstName | VARCHAR(100) | NOT NULL | User's first name |
| lastName | VARCHAR(100) | NOT NULL | User's last name |
| phone | VARCHAR(20) | NULL | Contact phone number |
| dateOfBirth | DATE | NULL | User's date of birth |
| gender | ENUM | NULL | Gender (male, female, other) |
| address | TEXT | NULL | User's address |
| role | ENUM | NOT NULL, DEFAULT 'patient' | User role (patient, doctor, admin) |
| isActive | BOOLEAN | DEFAULT true | Account status |
| emailVerified | BOOLEAN | DEFAULT false | Email verification status |
| profileImage | VARCHAR(500) | NULL | Profile image path |
| lastLogin | DATETIME | NULL | Last login timestamp |
| resetPasswordToken | VARCHAR(255) | NULL | Password reset token |
| resetPasswordExpires | DATETIME | NULL | Token expiration |

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE INDEX (email)
- INDEX (role, isActive)

### 2. Patients Table
**Purpose**: Patient-specific medical information and profile details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique patient identifier |
| userId | INTEGER | FOREIGN KEY, NOT NULL | Reference to users.id |
| bloodType | ENUM | NULL | Blood type (A+, A-, B+, B-, AB+, AB-, O+, O-) |
| allergies | TEXT | NULL | Known allergies (JSON or text) |
| emergencyContact | VARCHAR(100) | NULL | Emergency contact name |
| emergencyPhone | VARCHAR(20) | NULL | Emergency contact phone |
| insuranceProvider | VARCHAR(100) | NULL | Insurance company name |
| insuranceNumber | VARCHAR(50) | NULL | Insurance policy number |
| medicalHistory | TEXT | NULL | Medical history summary |
| currentMedications | TEXT | NULL | Current medications list |

**Indexes**:
- PRIMARY KEY (id)
- FOREIGN KEY (userId) REFERENCES users(id)
- INDEX (userId)

### 3. Doctors Table
**Purpose**: Doctor profiles and professional information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique doctor identifier |
| userId | INTEGER | FOREIGN KEY, NOT NULL | Reference to users.id |
| bmdcRegistrationNumber | VARCHAR(50) | UNIQUE, NULL | BMDC registration number |
| department | VARCHAR(100) | NULL | Medical department/specialty |
| experience | INTEGER | NULL | Years of experience |
| education | TEXT | NULL | Educational background |
| certifications | TEXT | NULL | Professional certifications |
| consultationFee | DECIMAL(10,2) | NULL | Consultation fee in BDT |
| availability | JSON | NULL | Availability schedule |
| bio | TEXT | NULL | Professional biography |
| rating | DECIMAL(3,2) | DEFAULT 0.00 | Average rating (0-5) |
| totalReviews | INTEGER | DEFAULT 0 | Total number of reviews |
| isVerified | BOOLEAN | DEFAULT false | Verification status |
| profileImage | VARCHAR(500) | NULL | Profile image path |
| degrees | JSON | NULL | Array of degrees |
| awards | JSON | NULL | Array of awards |
| hospital | VARCHAR(200) | NULL | Primary hospital/clinic |
| location | VARCHAR(300) | NULL | Hospital/clinic address |
| chamberTimes | JSON | NULL | Chamber availability times |
| languages | JSON | NULL | Languages spoken |
| services | JSON | NULL | Medical services offered |

**Indexes**:
- PRIMARY KEY (id)
- FOREIGN KEY (userId) REFERENCES users(id)
- UNIQUE INDEX (bmdcRegistrationNumber)
- INDEX (department, isVerified)
- INDEX (rating DESC)

### 4. Appointments Table
**Purpose**: Appointment scheduling and management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique appointment identifier |
| patientId | INTEGER | FOREIGN KEY, NOT NULL | Reference to patients.id |
| doctorId | INTEGER | FOREIGN KEY, NOT NULL | Reference to doctors.id |
| appointmentDate | DATE | NOT NULL | Appointment date |
| appointmentTime | TIME | NOT NULL | Appointment time |
| duration | INTEGER | NOT NULL, DEFAULT 180 | Duration in minutes |
| status | ENUM | NOT NULL, DEFAULT 'requested' | Status (requested, scheduled, confirmed, in_progress, completed, cancelled, no_show) |
| serialNumber | INTEGER | NULL | Daily serial number for doctor |
| type | ENUM | NOT NULL, DEFAULT 'in_person' | Type (in_person, telemedicine, follow_up) |
| reason | TEXT | NULL | Appointment reason |
| symptoms | TEXT | NULL | Patient symptoms |
| notes | TEXT | NULL | Additional notes |
| prescription | TEXT | NULL | Prescription details |
| diagnosis | TEXT | NULL | Diagnosis |
| followUpDate | DATE | NULL | Follow-up appointment date |
| meetingLink | VARCHAR(500) | NULL | Video consultation link |
| fee | DECIMAL(10,2) | NULL | Appointment fee |
| paymentStatus | ENUM | NOT NULL, DEFAULT 'pending' | Payment status |
| startedAt | DATETIME | NULL | Appointment start time |
| completedAt | DATETIME | NULL | Appointment completion time |

**Indexes**:
- PRIMARY KEY (id)
- FOREIGN KEY (patientId) REFERENCES patients(id)
- FOREIGN KEY (doctorId) REFERENCES doctors(id)
- INDEX (appointmentDate, doctorId)
- INDEX (status, appointmentDate)
- INDEX (patientId, appointmentDate)

### 5. LabTests Table
**Purpose**: Catalog of available laboratory tests

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique test identifier |
| name | VARCHAR(200) | NOT NULL | Test name |
| description | TEXT | NULL | Test description |
| category | VARCHAR(100) | NOT NULL | Test category |
| price | DECIMAL(10,2) | NOT NULL | Test price in BDT |
| sampleType | VARCHAR(100) | NOT NULL | Required sample type |
| preparationInstructions | TEXT | NULL | Preparation instructions |
| reportDeliveryTime | INTEGER | NOT NULL | Hours required for report |
| isActive | BOOLEAN | DEFAULT true | Test availability status |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (category, isActive)
- INDEX (name)

### 6. LabTestOrders Table
**Purpose**: Lab test order management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique order identifier |
| patientId | INTEGER | FOREIGN KEY, NOT NULL | Reference to patients.id |
| doctorId | INTEGER | FOREIGN KEY, NULL | Reference to doctors.id |
| appointmentId | INTEGER | FOREIGN KEY, NULL | Reference to appointments.id |
| orderNumber | VARCHAR(50) | UNIQUE, NOT NULL | Order reference number |
| status | ENUM | NOT NULL, DEFAULT 'pending' | Order status |
| totalAmount | DECIMAL(10,2) | NOT NULL | Total order amount |
| paymentStatus | ENUM | NOT NULL, DEFAULT 'pending' | Payment status |
| orderedAt | DATETIME | NOT NULL | Order timestamp |
| verifiedBy | INTEGER | FOREIGN KEY, NULL | Reference to users.id |
| verifiedAt | DATETIME | NULL | Verification timestamp |
| notes | TEXT | NULL | Additional notes |

**Indexes**:
- PRIMARY KEY (id)
- FOREIGN KEY (patientId) REFERENCES patients(id)
- FOREIGN KEY (doctorId) REFERENCES doctors(id)
- FOREIGN KEY (appointmentId) REFERENCES appointments(id)
- UNIQUE INDEX (orderNumber)
- INDEX (status, orderedAt)

### 7. Prescriptions Table
**Purpose**: Prescription management and tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique prescription identifier |
| appointmentId | INTEGER | FOREIGN KEY, NOT NULL | Reference to appointments.id |
| doctorId | INTEGER | FOREIGN KEY, NOT NULL | Reference to doctors.id |
| patientId | INTEGER | FOREIGN KEY, NOT NULL | Reference to patients.id |
| medicines | TEXT | NULL | Prescribed medicines (JSON) |
| symptoms | TEXT | NULL | Patient symptoms |
| diagnosis | TEXT | NULL | Medical diagnosis |
| suggestions | TEXT | NULL | Doctor suggestions |
| tests | TEXT | NULL | Recommended tests |
| testReports | TEXT | NULL | Test report references |
| status | ENUM | DEFAULT 'draft' | Prescription status |

**Indexes**:
- PRIMARY KEY (id)
- FOREIGN KEY (appointmentId) REFERENCES appointments(id)
- FOREIGN KEY (doctorId) REFERENCES doctors(id)
- FOREIGN KEY (patientId) REFERENCES patients(id)
- INDEX (patientId, createdAt)

## Database Relationships

### One-to-One Relationships
- **Users ↔ Patients**: Each user can have one patient profile
- **Users ↔ Doctors**: Each user can have one doctor profile
- **Patients ↔ PatientReminderSettings**: Each patient has one reminder settings record

### One-to-Many Relationships
- **Users → Notifications**: One user can have many notifications
- **Patients → Appointments**: One patient can have many appointments
- **Doctors → Appointments**: One doctor can have many appointments
- **Appointments → Prescriptions**: One appointment can have one prescription
- **Prescriptions → Medicines**: One prescription can have many medicines
- **Patients → Medicines**: One patient can have many medicines
- **Medicines → MedicineReminders**: One medicine can have many reminders
- **Medicines → MedicineDosages**: One medicine can have many dosage records

### Many-to-Many Relationships
- **LabTestOrders ↔ LabTests**: Through LabTestOrderItems junction table
- **LabOrderPayments ↔ LabTestOrderItems**: Through LabOrderPaymentAllocations junction table

## Database Constraints and Business Rules

### Data Integrity Constraints
1. **Foreign Key Constraints**: All foreign key relationships are enforced
2. **Unique Constraints**: Email addresses, BMDC numbers, and order numbers are unique
3. **Check Constraints**: Ratings are between 0-5, dates are valid
4. **NOT NULL Constraints**: Critical fields like IDs and essential data

### Business Rules
1. **User Roles**: Users can only have one role (patient, doctor, or admin)
2. **Appointment Scheduling**: No overlapping appointments for same doctor at same time
3. **Payment Status**: Orders must be paid before processing
4. **Prescription Validity**: Prescriptions are linked to completed appointments
5. **Rating System**: Only completed appointments can be rated

## Performance Optimization

### Indexing Strategy
1. **Primary Keys**: All tables have auto-increment primary keys
2. **Foreign Key Indexes**: All foreign keys are indexed for join performance
3. **Composite Indexes**: Common query patterns have composite indexes
4. **Unique Indexes**: Business-critical unique fields are indexed

### Query Optimization
1. **Eager Loading**: Sequelize associations are used for efficient joins
2. **Pagination**: Large result sets are paginated
3. **Selective Queries**: Only required fields are selected
4. **Connection Pooling**: Database connections are pooled for efficiency

## Data Migration and Seeding

### Migration Files
The database uses Sequelize migrations for schema versioning:
- **Initial Schema**: Core tables creation
- **Feature Additions**: New tables and columns
- **Data Migrations**: Data transformation and cleanup
- **Index Optimizations**: Performance improvements

### Seed Data
Essential seed data includes:
- **Lab Tests**: Comprehensive test catalog
- **Admin Users**: System administrator accounts
- **Sample Data**: For development and testing

## Backup and Recovery Strategy

### Backup Procedures
1. **Daily Full Backups**: Complete database backup
2. **Incremental Backups**: Changes since last backup
3. **Transaction Log Backups**: Point-in-time recovery capability

### Recovery Procedures
1. **Point-in-Time Recovery**: Restore to specific timestamp
2. **Partial Recovery**: Restore specific tables or data
3. **Disaster Recovery**: Complete system restoration

This database design provides a robust foundation for the healthcare application with proper normalization, referential integrity, and performance optimization while maintaining flexibility for future enhancements.
