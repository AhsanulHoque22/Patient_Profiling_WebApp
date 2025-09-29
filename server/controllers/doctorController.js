const { Doctor, User, Appointment, Patient, MedicalRecord } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const path = require('path');

// Get all doctors (public endpoint)
const getAllDoctors = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, specialization, search } = req.query;

    const whereClause = {
      isActive: true, // Only show active users
      role: 'doctor'
    };

    if (search) {
      whereClause[Op.or] = [
        { '$user.firstName$': { [Op.like]: `%${search}%` } },
        { '$user.lastName$': { [Op.like]: `%${search}%` } },
        { specialization: { [Op.like]: `%${search}%` } }
      ];
    }

    const doctors = await Doctor.findAndCountAll({
      include: [
        {
          association: 'user',
          attributes: { exclude: ['password'] },
          where: whereClause
        }
      ],
      order: [['rating', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true
    });

    res.json({
      success: true,
      data: {
        doctors: doctors.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(doctors.count / parseInt(limit)),
          totalRecords: doctors.count,
          hasNext: parseInt(page) * parseInt(limit) < doctors.count,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get doctor profile
const getDoctorProfile = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    
    const doctor = await Doctor.findByPk(doctorId, {
      include: [
        {
          association: 'user',
          attributes: { exclude: ['password'] }
        }
      ]
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

// Update doctor profile
const updateDoctorProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const doctorId = req.params.id;
    const { licenseNumber, specialization, experience, education, certifications, consultationFee, availability, bio } = req.body;

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    await doctor.update({
      licenseNumber,
      specialization,
      experience,
      education,
      certifications,
      consultationFee,
      availability,
      bio
    });

    const updatedDoctor = await Doctor.findByPk(doctorId, {
      include: [
        {
          association: 'user',
          attributes: { exclude: ['password'] }
        }
      ]
    });

    res.json({
      success: true,
      message: 'Doctor profile updated successfully',
      data: { doctor: updatedDoctor }
    });
  } catch (error) {
    next(error);
  }
};

// Get doctor appointments
const getDoctorAppointments = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const { page = 1, limit = 10, status, type, date } = req.query;

    const whereClause = { doctorId };
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      whereClause.appointmentDate = {
        [Op.gte]: startDate,
        [Op.lt]: endDate
      };
    }

    const appointments = await Appointment.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'patient',
          include: [{ association: 'user', attributes: ['firstName', 'lastName', 'email', 'phone'] }]
        }
      ],
      order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        appointments: appointments.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(appointments.count / parseInt(limit)),
          totalRecords: appointments.count,
          hasNext: parseInt(page) * parseInt(limit) < appointments.count,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update appointment status
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const { status, notes, diagnosis, prescription, followUpDate } = req.body;

    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    await appointment.update({
      status,
      notes,
      diagnosis,
      prescription,
      followUpDate
    });

    const updatedAppointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          association: 'patient',
          include: [{ association: 'user', attributes: ['firstName', 'lastName', 'email'] }]
        },
        {
          association: 'doctor',
          include: [{ association: 'user', attributes: ['firstName', 'lastName'] }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: { appointment: updatedAppointment }
    });
  } catch (error) {
    next(error);
  }
};

// Get doctor's patients
const getDoctorPatients = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const { page = 1, limit = 10, search } = req.query;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { '$user.firstName$': { [Op.like]: `%${search}%` } },
        { '$user.lastName$': { [Op.like]: `%${search}%` } },
        { '$user.email$': { [Op.like]: `%${search}%` } }
      ];
    }

    const patients = await Patient.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'user',
          attributes: { exclude: ['password'] }
        },
        {
          association: 'appointments',
          where: { doctorId },
          required: true,
          attributes: ['id', 'appointmentDate', 'status']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true
    });

    res.json({
      success: true,
      data: {
        patients: patients.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(patients.count / parseInt(limit)),
          totalRecords: patients.count,
          hasNext: parseInt(page) * parseInt(limit) < patients.count,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get doctor dashboard stats
const getDoctorDashboardStats = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const [
      totalAppointments,
      todayAppointments,
      completedAppointments,
      pendingAppointments,
      requestedAppointments,
      inProgressAppointments,
      totalPatients
    ] = await Promise.all([
      Appointment.count({ where: { doctorId } }),
      Appointment.count({ 
        where: { 
          doctorId, 
          appointmentDate: { [Op.between]: [startOfDay, endOfDay] }
        }
      }),
      Appointment.count({ where: { doctorId, status: 'completed' } }),
      Appointment.count({ where: { doctorId, status: 'scheduled' } }),
      Appointment.count({ where: { doctorId, status: 'requested' } }),
      Appointment.count({ where: { doctorId, status: 'in_progress' } }),
      Patient.count({
        include: [{
          association: 'appointments',
          where: { doctorId },
          required: true
        }],
        distinct: true
      })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalAppointments,
          todayAppointments,
          completedAppointments,
          pendingAppointments,
          requestedAppointments,
          inProgressAppointments,
          totalPatients
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current doctor profile (using authenticated user)
const getCurrentDoctorProfile = async (req, res, next) => {
  try {
    const userId = req.user.id; // From auth middleware
    
    const doctor = await Doctor.findOne({
      where: { userId },
      include: [
        {
          association: 'user',
          attributes: { exclude: ['password'] }
        }
      ]
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    res.json({
      success: true,
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

// Update current doctor profile (using authenticated user)
const updateCurrentDoctorProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const userId = req.user.id; // From auth middleware
    const { 
      specialization,
      experience,
      education,
      certifications,
      profileImage,
      degrees,
      awards,
      hospital,
      location,
      chamberTimes,
      consultationFee,
      languages,
      services,
      bio
    } = req.body;

    const doctor = await Doctor.findOne({
      where: { userId }
    });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    await doctor.update({
      specialization,
      experience,
      education,
      certifications,
      profileImage,
      degrees,
      awards,
      hospital,
      location,
      chamberTimes,
      consultationFee: consultationFee === '' ? null : consultationFee,
      languages,
      services,
      bio
    });

    const updatedDoctor = await Doctor.findByPk(doctor.id, {
      include: [
        {
          association: 'user',
          attributes: { exclude: ['password'] }
        }
      ]
    });

    res.json({
      success: true,
      message: 'Doctor profile updated successfully',
      data: { doctor: updatedDoctor }
    });
  } catch (error) {
    next(error);
  }
};

// Upload profile image
const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const userId = req.user.id;
    
    // Find the doctor profile
    const doctor = await Doctor.findOne({
      where: { userId }
    });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Generate the image URL (relative to the server)
    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Update the doctor's profile image
    await doctor.update({
      profileImage: imageUrl
    });

    // Also update the user's profile image
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        profileImage: imageUrl
      });
    }

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        imageUrl: imageUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDoctors,
  getDoctorProfile,
  updateDoctorProfile,
  getCurrentDoctorProfile,
  updateCurrentDoctorProfile,
  uploadProfileImage,
  getDoctorAppointments,
  updateAppointmentStatus,
  getDoctorPatients,
  getDoctorDashboardStats
};
