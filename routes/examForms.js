const router = require('express').Router();
const { submitExamForm, getExamForms, getMyExamForm, updateExamFormStatus, deleteExamForm } = require('../controllers/examFormController');
const { protect, admin } = require('../middleware/auth');

router.post('/', protect, submitExamForm);
router.get('/my', protect, getMyExamForm);
router.get('/', protect, admin, getExamForms);
router.put('/:id', protect, admin, updateExamFormStatus);
router.delete('/:id', protect, admin, deleteExamForm);

module.exports = router;
