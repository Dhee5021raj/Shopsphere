const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'shopsphere_super_secret_jwt_key_2026_viva_proof', {
    expiresIn: '30d'
  });
};

module.exports = generateToken;
