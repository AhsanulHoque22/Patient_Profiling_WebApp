const User = require('./User');
const Patient = require('./Patient');
const Doctor = require('./Doctor');
const Appointment = require('./Appointment');
const MedicalRecord = require('./MedicalRecord');

// User associations
User.hasOne(Patient, { foreignKey: 'userId', as: 'patientProfile' });
User.hasOne(Doctor, { foreignKey: 'userId', as: 'doctorProfile' });

// Patient associations
Patient.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Patient.hasMany(Appointment, { foreignKey: 'patientId', as: 'appointments' });
Patient.hasMany(MedicalRecord, { foreignKey: 'patientId', as: 'medicalRecords' });

// Doctor associations
Doctor.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Doctor.hasMany(Appointment, { foreignKey: 'doctorId', as: 'appointments' });
Doctor.hasMany(MedicalRecord, { foreignKey: 'doctorId', as: 'medicalRecords' });

// Appointment associations
Appointment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });
Appointment.hasMany(MedicalRecord, { foreignKey: 'appointmentId', as: 'medicalRecords' });

// MedicalRecord associations
MedicalRecord.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
MedicalRecord.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });
MedicalRecord.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });

module.exports = {
  User,
  Patient,
  Doctor,
  Appointment,
  MedicalRecord
};
