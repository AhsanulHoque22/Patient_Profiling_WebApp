const express = require('express');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all users (for dropdowns, etc.)
const getUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    
    const whereClause = { isActive: true };
    if (role) whereClause.role = role;
    
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
      limit: 50
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
};

// All routes require authentication
router.use(authenticateToken);

router.get('/', getUsers);

module.exports = router;
