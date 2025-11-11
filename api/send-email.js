import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name = '', email = '', phone = '', message = '' } = req.body || {};
    if (!email || !message) {
      return res.status(400).json({ error: 'Missing fields' });
    }

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
