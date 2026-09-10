const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { optionalAuth, authorizeRole, ROLES } = require('../middleware/auth');

// Support both JWT token auth and persona session context
router.use(optionalAuth);

router.get('/', certificateController.getCertificates);
router.post('/upload', certificateController.uploadCertificate);
router.post('/verify-ai', certificateController.verifyCertificateAI);

// Faculty & Platform Admin Certificate Approval
router.post('/verify-admin', authorizeRole(ROLES.ADMIN), (req, res) => {
  res.json({
    success: true,
    message: 'Certificate officially verified by Faculty Coordinator.',
    verifiedBy: req.user ? req.user.name : 'Faculty Coordinator',
    role: req.user ? req.user.role : 'ADMIN'
  });
});

module.exports = router;

