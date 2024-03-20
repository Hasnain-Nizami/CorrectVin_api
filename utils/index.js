import {body} from "express-validator"
import bcrypt from "bcrypt"
import puppeteer from "puppeteer";


const validateEmailFields = [
    body('from').optional().isEmail().withMessage('Invalid email format for "from"'),
    body('to').optional().isEmail().withMessage('Invalid email format for "to"'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('text').optional(),
  ];

  const pswCompare = async(bodyPsw,dbPsw)=>{
          const password = await bcrypt.compare(bodyPsw,dbPsw)
          return password
  }

  const generateTextEmailHTML = (text) => {
    return `
      <!DOCTYPE html>
      <html lang='en'>
      <head>
          <meta charset='UTF-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>CVR Report - Correct Vin Report</title>
      </head>
      <body style="background-color: #f4f4f4; font-family: Arial, sans-serif; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
              <h1 style="font-size: 2rem; font-weight: bold; color: #007bff; margin-bottom: 1rem;">Welcome to CorrectVin Report </h1>
              <pre style="font-size: 1rem; font-weight: bold; color: #007bff; margin-bottom: 1rem;">${text}</pre>
          </div>
      </body>
      </html>`;
  };
 

  const generateReceiptEmailHTML = ({ orderId, userInfo, transactionId, orderDate, paypalEmail, report, price }) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful - Report Delivery</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
            .email-container {
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                margin: 20px;
            }
            .user-details {
                background-color: #f4f4f4;
                color: #333;
                padding: 10px;
                border-radius: 8px;
                margin-top: 20px;
            }
            .logo-container {
                text-align: center;
                margin-bottom: 20px;
            }
            .logo {
                width: 100px;
                filter: brightness(0) invert(1) sepia(1) hue-rotate(200deg);
            }
            .invoice-table {
                width: 100%;
                margin-top: 20px;
                border-collapse: collapse;
            }
            .invoice-table th, .invoice-table td {
                padding: 10px;
                border: 1px solid #ddd;
            }
            .invoice-table th {
                text-align: left;
                background-color: #f2f2f2;
                font-weight: bold;
            }
            .invoice-table td {
                text-align: right;
            }
            .invoice-table tfoot {
                font-weight: bold;
            }
            p {
                color: #333;
                line-height: 1.6;
            }
            ul {
                list-style-type: none;
                padding: 0;
            }
            li {
                margin-bottom: 10px;
            }
            strong {
                font-weight: bold;
            }
            a {
                color: #007BFF;
                text-decoration: none;
            }
            a:hover {
                text-decoration: underline;
            }
            .signature {
                font-size: 14px;
                margin-top: 20px;
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
        <div class="email-container">
            <h1 style="font-weight: bold; font-size: 30px; color: #333; text-align: center;"><span style="color: #FFD700;">CORRECT</span>VIN<sup style="font-size: 12px;">®</sup></h1>
            <h2 style="text-align: center;">RECEIPT</h2>
            <h3 style="text-align: center;">Order # ${orderId}</h3>
            <br>
            <p style="color: #333; line-height: 1.6;">Dear ${userInfo?.firstName} ${userInfo?.lastName},</p>
            <p style="color: #333; line-height: 1.6;">We want to inform you that the payment for the recent transaction <strong>Transaction ID: ${transactionId}</strong> has been successfully processed. Your report will be delivered to your email within the next 12 hours.</p>
            <ul">
                <li><strong>Order Date:</strong> ${new Date(orderDate).toLocaleString()}</li>
                <li><strong>Order Id:</strong> ${orderId}</li>
                <li><strong>Payment Source:</strong> Paypal</li>
                <li><strong>Paypal Email:</strong> ${paypalEmail}</li>
                <li><strong>Full Name:</strong> ${userInfo?.firstName} ${userInfo?.lastName}</li>
                <li><strong>VIN Number:</strong> ${userInfo?.vinNumber}</li>
                <li><strong>Phone Number:</strong> ${userInfo?.phoneNumber}</li>
                <li><strong>Email:</strong> ${userInfo?.email}</li>
                <li><strong>Country:</strong> ${userInfo?.country}</li>
                <li><strong>Region:</strong> ${userInfo?.region}</li>
            </ul>
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse; border: 1px solid #ddd;">
                <thead>
                    <tr>
                        <th style="padding: 10px; text-align: left; background-color: #f2f2f2; font-weight: bold; border: 1px solid #ddd;">Product</th>
                        <th style="padding: 10px; text-align: right; background-color: #f2f2f2; font-weight: bold; border: 1px solid #ddd;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #333;">${report}-Report x 1</span>
                            </div>
                        </td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${price}$</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; text-align: left; font-weight: bold; border: 1px solid #ddd;">Subtotal</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${price}$</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th style="padding: 10px; text-align: left; font-weight: bold; border: 1px solid #ddd;">Total</th>
                        <td style="padding: 10px; text-align: right; font-weight: bold; border: 1px solid #ddd;">${price}$</td>
                    </tr>
                </tfoot>
            </table>
            <p style="color: #333; line-height: 1.6; margin-top: 20px;">Your cooperation in this matter is appreciated. If you have any questions or concerns, please feel free to reach out to us.</p>
            <p style="color: #333; line-height: 1.6;">Thank you for choosing CORRECT VIN<sup style="font-size: 12px;">®</sup>.</p>
        </div>
        <div class="user-details" style=" padding: 20px; border-radius: 8px; margin-top: 20px; ">
            <p style="font-weight: bold;">Best regards,</p>
            CORRECTVIN TEAM
        </div>
    </body>
    </html>
    `
  }

  const generatePDF = async (htmlContent) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();
    return pdfBuffer;
  };

  export {
    validateEmailFields,
    pswCompare,
    generateTextEmailHTML,
    generateReceiptEmailHTML,
    generatePDF
  }