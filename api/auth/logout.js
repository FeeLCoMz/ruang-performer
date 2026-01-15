import '../../env.js';

export default function handler(req, res) {
  if (req.logout) {
    req.logout(() => {
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
}
