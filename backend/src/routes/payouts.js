const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../services/mailer');

const MIN_PAYOUT = 1.0;

router.post('/request', authMiddleware, (req, res) => {
  const { id } = req.device;
  const { currency = 'USDC' } = req.body;

  const total = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM earnings WHERE device_id = ?`).get(id).t;
  const paid = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM payouts WHERE device_id = ? AND status != 'failed'`).get(id).t;
  const available = parseFloat((total - paid).toFixed(6));

  if (available < MIN_PAYOUT) return res.status(400).json({ error: `Minimum payout is ${MIN_PAYOUT}`, available });

  const payoutId = uuidv4();
  db.prepare(`INSERT INTO payouts (id, device_id, amount, currency) VALUES (?, ?, ?, ?)`).run(payoutId, id, available, currency);

  // Notify contributor
  const device = db.prepare('SELECT payout_address FROM devices WHERE id = ?').get(id);
  sendEmail(device.payout_address, 'Voltrix: Payout Requested',
    `Your payout of ${available.toFixed(4)} ${currency} has been requested and is being processed.`
  ).catch(() => {});

  res.json({ payout_id: payoutId, amount: available, status: 'pending' });
});

router.get('/history', authMiddleware, (req, res) => {
  const { id } = req.device;
  const history = db.prepare(`SELECT * FROM payouts WHERE device_id = ? ORDER BY created_at DESC`).all(id);
  res.json(history);
});

module.exports = router;
