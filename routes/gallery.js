const router = require('express').Router();
const { getGallery, addGalleryItem, deleteGalleryItem } = require('../controllers/galleryController');
const { protect, admin } = require('../middleware/auth');
const { uploadGallery } = require('../middleware/cloudinary');

router.get('/', getGallery);
router.post('/', protect, admin, uploadGallery.array('image', 20), addGalleryItem);
router.delete('/:id', protect, admin, deleteGalleryItem);

module.exports = router;
