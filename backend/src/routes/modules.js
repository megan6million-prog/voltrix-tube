const router = require('express').Router();
const db = require('../db');

// Get active modules for a platform
router.get('/active', (req, res) => {
  const { platform } = req.query;
  const col = platform === 'mobile' ? 'enabled_mobile' : 'enabled_desktop';
  const modules = db.prepare(`SELECT id, name, description FROM modules WHERE ${col} = 1`).all();
  res.json(modules);
});

module.exports = router;
