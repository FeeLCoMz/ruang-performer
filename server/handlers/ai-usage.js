/**
 * ai-usage.js
 *
 * GET /api/ai/usage — sisa kuota AI Autofill bulan ini untuk user yang login.
 */
import { verifyToken } from '../_auth.js';
import { getTursoClient } from '../_turso.js';
import { getUsage, getMonthlyLimit, currentPeriod } from '../_aiUsage.js';

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user?.userId || req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const usage = await getUsage(getTursoClient(), userId);
    // Bila DB tidak bisa dibaca, tetap kembalikan bentuk yang konsisten:
    // kuota dianggap belum terpakai (fail-open, sama seperti checkQuota).
    return res.status(200).json(
      usage || {
        used: 0,
        limit: getMonthlyLimit(),
        remaining: getMonthlyLimit(),
        period: currentPeriod(),
        unavailable: true,
      },
    );
  } catch (error) {
    console.error('AI usage error:', error);
    return res.status(200).json({
      used: 0,
      limit: getMonthlyLimit(),
      remaining: getMonthlyLimit(),
      period: currentPeriod(),
      unavailable: true,
    });
  }
}
