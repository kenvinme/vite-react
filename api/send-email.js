import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name = '', email = '', phone = '', message = '', company = '', ts = '' } = req.body || {};

    // Server-side anti-spam
    if (company) return res.status(400).json({ error: 'spam: honeypot' });
    const start = Number(ts || 0);
    const age = Date.now() - start;
    if (!start || Number.isNaN(start) || age < 2500 || age > 30 * 60 * 1000) {
      return res.status(400).json({ error: 'spam: timing' });
    }

    // Basic validation
    const emailOk = typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (!emailOk) return res.status(400).json({ error: 'invalid email' });
    if (!message || String(message).length > 5000) return res.status(400).json({ error: 'invalid message' });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.MAIL_FROM || 'Yumzyfood <contact@yumzyfood.com>';
    const to = process.env.MAIL_TO || 'kenvin@yumzyfood.com';

    const subject = `Liên hệ báo giá từ ${name || 'Khách hàng'}`;
    const text = `Họ tên: ${name}\nEmail: ${email}\nĐiện thoại: ${phone}\n\nNội dung:\n${message}`;

    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
