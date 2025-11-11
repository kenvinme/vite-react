import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message, phone } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const data = await resend.emails.send({
      from: 'contact@yumzyfood.com',
      to: 'kenvin@yumzyfood.com',
      subject: `Liên hệ báo giá từ ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;">
          <h3>Thông tin khách hàng:</h3>
          <p><strong>Họ tên:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Số điện thoại:</strong> ${phone}</p>` : ''}
          <p><strong>Nội dung:</strong><br>${message}</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
