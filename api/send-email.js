// /api/send-email.js
import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method Not Allowed' });

  const { name, phone, email, message } = req.body || {};
  if (!name || !phone || !email || !message) {
    return res.status(400).json({ ok:false, error: 'Missing fields' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Lưu ý: domain gửi (from) nên đã verify trong Resend (VD: yumzyfood.com)
    await resend.emails.send({
      from: 'KCANS <no-reply@yumzyfood.com>',
      to: 'kenvin@yumzyfood.com',
      subject: `[KCANS] Yêu cầu báo giá – ${name}`,
      text:
`Họ và tên: ${name}
Số điện thoại: ${phone}
Email: ${email}

Nội dung:
${message}`
    });
    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || 'Send failed' });
  }
}
