// Vercel serverless function: sends a commission request to Eri's Messenger
// through the Facebook Page Send API.
// Needs two environment variables in Vercel:
//   PAGE_ACCESS_TOKEN  (Facebook Page access token)
//   ERI_PSID           (Eri's page-scoped ID, the person who receives the message)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.trim() : '';

  // simple spam trap: real visitors never fill the hidden field
  if (body.hp) return res.status(200).json({ ok: true });

  if (!text || text.length > 1800) {
    return res.status(400).json({ ok: false, error: 'Invalid message' });
  }

  const token = process.env.PAGE_ACCESS_TOKEN;
  const psid = process.env.ERI_PSID;
  if (!token || !psid) {
    return res.status(500).json({ ok: false, error: 'Server is not configured' });
  }

  try {
    const fb = await fetch(
      'https://graph.facebook.com/v21.0/me/messages?access_token=' + encodeURIComponent(token),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: psid },
          messaging_type: 'RESPONSE',
          message: { text: 'New commission request\n\n' + text },
        }),
      }
    );
    const data = await fb.json().catch(() => ({}));
    if (!fb.ok) {
      console.error('Facebook error', JSON.stringify(data));
      return res.status(502).json({ ok: false, error: 'Facebook rejected the message' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ ok: false, error: 'Could not reach Facebook' });
  }
};
