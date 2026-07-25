const router = require('express').Router();
const db = require('../db');
const { adminMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../services/mailer');

// Fleet overview
router.get('/fleet', adminMiddleware, (req, res) => {
  const devices = db.prepare(`SELECT id, payout_address, platform, tier, streak, uptime_days, banned, last_seen FROM devices`).all();
  const totalEarnings = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM earnings`).get().t;
  const pendingPayouts = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM payouts WHERE status='pending'`).get().t;
  res.json({ devices, totalEarnings, pendingPayouts });
});

// Toggle module per platform
router.patch('/modules/:id', adminMiddleware, (req, res) => {
  const { enabled_desktop, enabled_mobile } = req.body;
  db.prepare(`UPDATE modules SET enabled_desktop = COALESCE(?, enabled_desktop), enabled_mobile = COALESCE(?, enabled_mobile) WHERE id = ?`)
    .run(enabled_desktop ?? null, enabled_mobile ?? null, req.params.id);
  res.json({ ok: true });
});

// Ban/unban device
router.patch('/devices/:id/ban', adminMiddleware, (req, res) => {
  const { banned } = req.body;
  db.prepare(`UPDATE devices SET banned = ? WHERE id = ?`).run(banned ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// Process payout
router.patch('/payouts/:id', adminMiddleware, (req, res) => {
  const { status } = req.body;
  db.prepare(`UPDATE payouts SET status = ? WHERE id = ?`).run(status, req.params.id);

  if (status === 'paid') {
    const payout = db.prepare('SELECT p.*, d.payout_address FROM payouts p JOIN devices d ON p.device_id = d.id WHERE p.id = ?').get(req.params.id);
    if (payout) {
      sendEmail(payout.payout_address, 'Voltrix: Payout Sent!',
        `Your payout of ${payout.amount.toFixed(4)} ${payout.currency} has been sent to ${payout.payout_address}.`
      ).catch(() => {});
    }
  }

  res.json({ ok: true });
});

// Earnings analytics
router.get('/analytics', adminMiddleware, (req, res) => {
  const byModule = db.prepare(`SELECT module_id, SUM(amount) as total FROM earnings GROUP BY module_id`).all();
  const topEarners = db.prepare(`
    SELECT device_id, SUM(amount) as total FROM earnings GROUP BY device_id ORDER BY total DESC LIMIT 10
  `).all();
  res.json({ byModule, topEarners });
});

module.exports = router;
