const router = require('express').Router();
const { getCourses, getCourse, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/', protect, admin, upload.single('image'), createCourse);
router.put('/:id', protect, admin, upload.single('image'), updateCourse);
router.delete('/:id', protect, admin, deleteCourse);

module.exports = router;
