import { QRCodeCanvas } from "qrcode.react";

function Footer() {
  return (
    <div className="text-center my-4">
      <QRCodeCanvas 
        value="https://www.yumzyfood.com"
        size={160}
        bgColor="#ffffff"
        fgColor="#002147"  // navy
        level="H"
        includeMargin={true}
      />
      <p className="mt-2 text-sm">Scan để truy cập Yumzyfood.com</p>
    </div>
  );
}

export default Footer;
