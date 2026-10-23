const router = require('express').Router();
const { submitContact, getContacts, markRead, deleteContact } = require('../controllers/contactController');
const { protect, admin } = require('../middleware/auth');

router.post('/', submitContact);
router.get('/', protect, admin, getContacts);
router.put('/:id/read', protect, admin, markRead);
router.delete('/:id', protect, admin, deleteContact);

module.exports = router;
