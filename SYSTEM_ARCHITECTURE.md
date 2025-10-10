# System Architecture Documentation

## Overview

The Healthcare Web Application is a comprehensive full-stack healthcare management system designed to facilitate patient-doctor interactions, appointment management, medical records, and administrative oversight. The system follows a modern microservices-inspired architecture with clear separation of concerns.

## Architecture Pattern

The application follows a **3-tier architecture** pattern:

1. **Presentation Layer** (Frontend)
2. **Business Logic Layer** (Backend API)
3. **Data Access Layer** (Database)

## Technology Stack

### Frontend Technologies
- **React 18.3.1** with TypeScript for type safety
- **React Router 6.30.1** for client-side routing
- **TanStack Query 5.90.2** for server state management and caching
- **React Hook Form 7.63.0** with Yup validation for form handling
- **Tailwind CSS 3.4.0** for utility-first styling
- **Heroicons 2.2.0** for consistent iconography
- **Axios 1.12.2** for HTTP client
- **React Hot Toast 2.6.0** for notifications
- **Recharts 3.2.1** for data visualization
- **JSPDF 3.0.3** for PDF generation
- **Jitsi React SDK 1.4.4** for video consultations

### Backend Technologies
- **Node.js** with Express.js 4.18.2 as the web framework
- **MySQL 8.0** as the primary database
- **Sequelize 6.35.2** as the ORM for database operations
- **JWT** (jsonwebtoken 9.0.2) for authentication
- **bcryptjs 2.4.3** for password hashing
- **Multer 1.4.5** for file uploads
- **Express Validator 7.0.1** for input validation
- **Helmet 7.1.0** for security headers
- **CORS 2.8.5** for cross-origin resource sharing
- **Morgan 1.10.0** for HTTP request logging
- **Express Rate Limit 7.1.5** for API rate limiting
- **Compression 1.7.4** for response compression
- **Socket.io 4.7.4** for real-time communication
- **Nodemailer 6.9.7** for email notifications

### Infrastructure & DevOps
- **Docker & Docker Compose** for containerization
- **Nginx** for reverse proxy and static file serving
- **Redis 7** for caching (optional)
- **Sequelize CLI** for database migrations

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  React SPA (TypeScript)                                        │
│  ├── Pages & Components                                        │
│  ├── Context Providers (Auth, Notifications)                  │
│  ├── Protected Routes with Role-based Access                  │
│  ├── TanStack Query for State Management                      │
│  └── Responsive UI with Tailwind CSS                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS/HTTP
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LOAD BALANCER                             │
├─────────────────────────────────────────────────────────────────┤
│  Nginx Reverse Proxy                                           │
│  ├── SSL Termination                                          │
│  ├── Static File Serving                                      │
│  ├── Rate Limiting                                            │
│  └── Request Routing                                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Express.js API Server                                         │
│  ├── Authentication Middleware (JWT)                          │
│  ├── Authorization Middleware (Role-based)                    │
│  ├── Input Validation                                         │
│  ├── Error Handling                                           │
│  ├── Request Logging                                          │
│  └── Security Headers                                         │
│                                                                 │
│  Controllers Layer:                                            │
│  ├── Auth Controller                                          │
│  ├── User Controller                                          │
│  ├── Appointment Controller                                   │
│  ├── Patient Controller                                       │
│  ├── Doctor Controller                                        │
│  ├── Admin Controller                                         │
│  ├── Lab Test Controller                                      │
│  ├── Prescription Controller                                  │
│  ├── Payment Controller (Bkash)                              │
│  └── Notification Controller                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│  Services & Utilities                                          │
│  ├── Authentication Service                                   │
│  ├── Email Service (Nodemailer)                              │
│  ├── Payment Service (Bkash Integration)                     │
│  ├── File Upload Service                                      │
│  ├── Notification Service                                     │
│  └── Validation Utilities                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  Sequelize ORM                                                 │
│  ├── Model Definitions                                        │
│  ├── Database Associations                                    │
│  ├── Query Builders                                           │
│  └── Migration Management                                     │
│                                                                 │
│  MySQL Database                                                │
│  ├── User Management Tables                                   │
│  ├── Medical Records                                          │
│  ├── Appointment System                                       │
│  ├── Lab Test Management                                      │
│  ├── Payment Records                                          │
│  └── Audit Logs                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Docker Containerization

The application is containerized using Docker with the following services:

1. **Frontend Container** (React SPA)
   - Built with multi-stage Docker build
   - Served via Nginx
   - Exposed on port 3001

2. **Backend Container** (Node.js API)
   - Express.js server
   - Exposed on port 5001
   - Volume mounted for file uploads

3. **Database Container** (MySQL 8.0)
   - Persistent data storage
   - Exposed on port 3307
   - Volume mounted for data persistence

4. **Redis Container** (Optional)
   - Caching layer
   - Exposed on port 6379
   - Volume mounted for data persistence

### Network Architecture

```
Internet
    │
    ▼
┌─────────────────┐
│   Load Balancer │
│     (Nginx)     │
└─────────────────┘
    │
    ├── Port 3001 ──► Frontend Container
    │
    ├── Port 5001 ──► Backend Container
    │
    ├── Port 3307 ──► MySQL Database
    │
    └── Port 6379 ──► Redis Cache
```

## Security Architecture

### Authentication & Authorization
- **JWT-based Authentication** with configurable expiration
- **Role-based Access Control** (RBAC) with three roles:
  - Patient
  - Doctor
  - Admin
- **Password Hashing** using bcrypt with salt rounds
- **Session Management** with token refresh capabilities

### Security Measures
- **Helmet.js** for security headers
- **CORS** configuration for cross-origin requests
- **Rate Limiting** to prevent abuse
- **Input Validation** using express-validator
- **SQL Injection Protection** via Sequelize ORM
- **XSS Protection** through input sanitization
- **File Upload Security** with type and size restrictions

### Data Protection
- **Encrypted Password Storage**
- **Secure File Upload** with validation
- **Audit Logging** for sensitive operations
- **Environment Variable** management for secrets

## Scalability Considerations

### Horizontal Scaling
- **Stateless API Design** allows multiple backend instances
- **Database Connection Pooling** for efficient resource usage
- **Load Balancer Ready** architecture
- **Container Orchestration** support (Docker Compose → Kubernetes ready)

### Performance Optimizations
- **React Query Caching** reduces API calls
- **Database Indexing** on frequently queried fields
- **Compression Middleware** for response optimization
- **Static File Serving** via Nginx
- **Redis Caching** for frequently accessed data

### Monitoring & Logging
- **Morgan HTTP Logging** for request tracking
- **Error Handling Middleware** for centralized error management
- **Health Check Endpoints** for service monitoring
- **Structured Logging** for debugging and analytics

## Development Workflow

### Environment Setup
1. **Development**: Local development with hot reload
2. **Staging**: Docker containerized environment
3. **Production**: Fully containerized with optimized builds

### Database Management
- **Migration-based Schema Changes**
- **Seeding** for initial data
- **Backup Strategies** for data protection
- **Version Control** for schema changes

### API Design
- **RESTful API** design principles
- **Consistent Response Formats**
- **Error Handling Standards**
- **API Documentation** (OpenAPI/Swagger ready)

## Integration Points

### External Services
1. **Payment Gateway**: Bkash integration for payments
2. **Email Service**: Nodemailer for notifications
3. **Video Conferencing**: Jitsi for telemedicine
4. **File Storage**: Local file system with upload capabilities

### Future Integration Capabilities
- **HL7 FHIR** for healthcare data standards
- **SMS Gateway** for notifications
- **Cloud Storage** (AWS S3, Google Cloud)
- **Analytics Platform** integration
- **Third-party Lab Systems** integration

## Maintenance & Operations

### Backup Strategy
- **Database Backups** with automated scheduling
- **File System Backups** for uploaded documents
- **Configuration Backups** for environment settings

### Update Procedures
- **Zero-downtime Deployments** using rolling updates
- **Database Migration** procedures
- **Rollback Capabilities** for failed deployments

### Performance Monitoring
- **Application Metrics** tracking
- **Database Performance** monitoring
- **Error Rate** tracking
- **Response Time** monitoring

This architecture provides a robust, scalable, and maintainable foundation for the healthcare web application while ensuring security, performance, and user experience requirements are met.
