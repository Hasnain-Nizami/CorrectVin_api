import fetch from "node-fetch";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, EMAIL_PASS, EMAIL_USER } =
  process.env;
const base = "https://api-m.sandbox.paypal.com";
import nodemailer from "nodemailer";
import { validationResult } from "express-validator";
import CapturedOrder from "../Model/captureOrderSchema.js";
import userModel from "../Model/userSchema.js";
import { pswCompare } from "../utils/index.js";
import mongoose from "mongoose";

//************* generateAccessToken **************//

const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET
    ).toString("base64");
    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
  }
};

//*****************   handleResponse  ******************//

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

//*******   createOrder **********//

const createOrder = async (report) => {
  const data = report[0];
  try {
    // use the cart information passed from the front-end to calculate the purchase unit details
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders`;
    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: data.price,
          },
        },
      ],
    };

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  } catch (error) {
    res.status(500).json({ error: "Failed to create order." });
  }
};

//*********************   captureOrder *************************//

const captureOrder = async (orderID) => {
  try {
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders/${orderID}/capture`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return handleResponse(response);
  } catch (error) {
    res.status(500).json({ error: "Failed to Captured order." });
  }
};

//*************   order  ********************

const order = async (req, res) => {
  try {
    const { report } = req.body;
    const { jsonResponse, httpStatusCode } = await createOrder(report);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    res.status(500).json({ error: "Failed to create order." });
  }
};

//************** Capture ****************

const capture = async (req, res) => {
  try {
    const { orderID } = req.params;
    const { values, report, price } = req.body;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);

    const capturedOrder = new CapturedOrder({
      orderID,
      jsonResponse,
      httpStatusCode,
      userProvidedData: values,
    });
    await capturedOrder.save();
    res.status(httpStatusCode).json(jsonResponse);

    const mail = await fetch("https://real-jade-sea-urchin-tam.cyclic.app/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "aliahmedyk18@gmail.com",
        subject: `Correct VIN Report Purchase Slip`,
        to: values.email,
        userInfo: values,
        report,
        price,
        orderId : jsonResponse.purchase_units[0].payments.captures[0].id
      }),
    });


    const mailUs = await fetch("https://real-jade-sea-urchin-tam.cyclic.app/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "aliahmedyk18@gmail.com",
        subject: `Report Purchase By ${values.firstName} ${values.lastName}`,
        text: `
        NAME : ${values.firstName} ${values.lastName}.
        EMAIL : ${values.email}.
        Contact: ${values.phoneNumber}.
        VinNumber: ${values.vinNumber}.
        Country: ${values.country}.
        Region : ${values.region}
      `, 
      }),
    });
  } catch (error) {
    console.error("Failed to capture order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
};

const sendEmail = async (req, res) => {

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { to, subject, text, from, userInfo, report, price,orderId } = req.body;

      

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: from || EMAIL_USER,
      to: to || EMAIL_USER,
      subject: subject,
      text: text || "",
      html: text
        ? `<!DOCTYPE html>
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
          </html>`
        : `<!DOCTYPE html>
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

    <h1 style="font-weight: bold; font-size: 30px; color: #333;"><span style="color: #FFD700;">CORRECT</span>VIN<sup style="font-size: 12px;">®</sup></h1>

    <p style="color: #333; line-height: 1.6;"><strong>Subject:</strong> Payment Successful - Report Delivery</p>
    <br>
    <p style="color: #333; line-height: 1.6;">Dear ${userInfo?.firstName} ${userInfo?.lastName},</p>

    <p style="color: #333; line-height: 1.6;">I trust this email finds you well. We want to inform you that the payment for the recent transaction <strong>Transaction ID: ${orderId}</strong> has been successfully processed. Your report will be delivered to your email within the next 12 hours.</p>

    <ul style="padding-left: 20px;">
      <li><strong>VIN Number:</strong> ${userInfo?.vinNumber}</li>
      <li><strong>Phone Number:</strong> ${userInfo?.phoneNumber}</li>
      <li><strong>Country/Region:</strong> ${userInfo?.country}</li>
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

  <div class="user-details" style=" padding: 10px; border-radius: 8px; margin-top: 20px; ">
    <p style="font-weight: bold;">Best regards,</p>
    CORRECT VIN Team<sup style="font-size: 12px;">®</sup><br>
  </div>
</body>
</html> 
        `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};





const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if ((!email || !password)) {
      res.status(401).json({
        status: false,
        data: null,
        message: "required fields are missing",
      });
      return;
    }
    const emailExist = await userModel.findOne({ email });
    if (!emailExist) {
      res.status(401).json({
        status: false,
        message: "invalid credentials",
        data: null,
      });
      return;
    }

    const checkPsw = await pswCompare(password, emailExist.password);
    if (!checkPsw) {
      res.status(401).json({
        status: false,
        message: "invalid credentials",
        data: null,
      });
      return;
    } else {
      const token = jwt.sign({ id: emailExist._id }, process.env.PRIVATE_KEY);
      res.status(200).json({
        status: true,
        message: "user logIn successfully",
        data : emailExist,
        token
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: error.message,
    });
  }
}


const getAllUsers = async (req, res) => {
  try {
    const allUsers = await CapturedOrder.find({}).sort({ captureDate: -1 });
    res.status(200).json({
      status: true,
      message: "get all user successfully",
      data: allUsers,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
      data: null,
    });
  }
};


const getSingleUser = async (req, res) => {
  try {
    const { id } = req.params;
    if(!id){
      return res.status(404).json({
        status: false,
        message: "user id required",
        data: null
      });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        status: false,
        message: "Invalid user ID",
        data: null
      });
    }

    const data = await CapturedOrder.findById(id);

    if (!data) {
      return res.status(404).json({
        status: false,
        message: "user not found",
        data: null
      });
    }

    res.status(200).json({
      status: true,
      message: "Get single user",
      data
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
      data: null
    });
  }
};
export {
  generateAccessToken,
  handleResponse,
  createOrder,
  captureOrder,
  order,
  capture,
  sendEmail,
  userLogin,
  getAllUsers,
  getSingleUser
};
