const router = require('express').Router();
const {
  getAdmitCardSetting, toggleAdmitCard,
  getAdmitCard, getMyAdmitCard,
  getExamSchedule, saveExamSchedule, getScheduleHistory,
  getScheduleOptions, verifyAdmitCardToken,
  regenerateToken,
} = require('../controllers/admitCardController');
const { protect, admin } = require('../middleware/auth');

router.get('/setting',           getAdmitCardSetting);
router.get('/schedule',          getExamSchedule);
router.get('/schedule/history',  protect, admin, getScheduleHistory);
router.get('/schedule/options',  protect, admin, getScheduleOptions);
router.get('/my',               protect, getMyAdmitCard);
router.get('/student',          protect, getMyAdmitCard); // Alias for /api/student/admit-card
router.get('/verify/:token',    verifyAdmitCardToken); // Secure QR token verification endpoint
router.post('/toggle',          protect, admin, toggleAdmitCard);
router.post('/schedule',        protect, admin, saveExamSchedule);
router.post('/regenerate-token', protect, admin, regenerateToken);
router.get('/:enrollmentNumber', getAdmitCard);

module.exports = router;
