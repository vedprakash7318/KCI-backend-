const router = require('express').Router();
const { getStaff, createStaff, updateStaff, deleteStaff } = require('../controllers/staffController');
const { protect, admin } = require('../middleware/auth');
const { uploadStaff } = require('../middleware/cloudinary');

router.get('/', getStaff);
router.post('/', protect, admin, uploadStaff.single('photo'), createStaff);
router.put('/:id', protect, admin, uploadStaff.single('photo'), updateStaff);
router.delete('/:id', protect, admin, deleteStaff);

module.exports = router;
