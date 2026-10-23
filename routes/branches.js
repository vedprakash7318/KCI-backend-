const router = require('express').Router();
const { getBranches, createBranch, updateBranch, deleteBranch } = require('../controllers/branchController');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getBranches);
router.post('/', protect, admin, upload.single('image'), createBranch);
router.put('/:id', protect, admin, updateBranch);
router.delete('/:id', protect, admin, deleteBranch);

module.exports = router;
