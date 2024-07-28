import fetch from "node-fetch";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const { STRIPE_SECRET, EMAIL_USER , EMAIL_PASS} = process.env;
// const base = "https://api-m.paypal.com";

// const base = "https://sandbox.paypal.com";

import nodemailer from "nodemailer";
import { validationResult } from "express-validator";
import CapturedOrder from "../Model/captureOrderSchema.js";
import userModel from "../Model/userSchema.js";
import { generateReceiptEmailHTML, generateTextEmailHTML, pswCompare } from "../utils/index.js";
import mongoose from "mongoose";
import Stripe from "stripe";
const stripe = Stripe(STRIPE_SECRET)
//************* generateAccessToken **************//

const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET,
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
            currency_code: data.currency_code,
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
    const { values, report, price, symbol } = req.body;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);

    const capturedOrder = new CapturedOrder({
      orderID,
      jsonResponse,
      httpStatusCode,
      userProvidedData: values,
    });
    await capturedOrder.save();

    const emailTo = values.email.trim()

    const mail = await fetch("https://correctvin-api.onrender.com/api/send-email", {
    // const mail = await fetch("http://localhost:5000/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${EMAIL_USER}`,
        subject: `CorrectVin Order Summary (Order# ${jsonResponse.id})`,
        to: emailTo,
        userInfo: values,
        report,
        price,
        symbol,
        orderId: jsonResponse.id,
        transactionId: jsonResponse.purchase_units[0].payments.captures[0].id,
        orderDate:
          jsonResponse.purchase_units[0].payments.captures[0].create_time,
        paypalEmail: jsonResponse.payment_source.paypal.email_address,
      }),
    });



    const mailUs = await fetch("https://correctvin-api.onrender.com/api/send-email", {
    // const mailUs = await fetch("http://localhost:5000/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${EMAIL_USER}`,
        to: `${EMAIL_USER}`,
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
    res.status(httpStatusCode).json(jsonResponse);

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

    const {
      to,
      subject,
      text,
      from,
      userInfo,
      report,
      price,
      symbol,
      orderId,
      transactionId,
      orderDate,
    } = req.body;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });


    let mailOptions;
    
    if (text) {
      
      mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: subject,
        text: text,
        html: generateTextEmailHTML(text),
      };
    } else {
      const emailHTML = generateReceiptEmailHTML({ orderId, userInfo, transactionId, orderDate, report, price,symbol });
      mailOptions = {
        from: "Correct Vin <customersupports@correctvin.com>",
        to: `${to}`,
        subject: subject,
        html:emailHTML
      };
    }


    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully!" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
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
        data: emailExist,
        token,
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      data: null,
      message: error.message,
    });
  }
};

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
    if (!id) {
      return res.status(404).json({
        status: false,
        message: "user id required",
        data: null,
      });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        status: false,
        message: "Invalid user ID",
        data: null,
      });
    }

    const data = await CapturedOrder.findById(id);

    if (!data) {
      return res.status(404).json({
        status: false,
        message: "user not found",
        data: null,
      });
    }

    res.status(200).json({
      status: true,
      message: "Get single user",
      data,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
      data: null,
    });
  }
};



const stripeCheckout = async (req, res) => {
  try {
    const {
      price,
      payment_method,
      card_holder_name,
      customer_email,
      customer_name,
      currency,
      report,
      values,
      code,
      symbol
    } = req.body;

     // Create a customer
     const customer = await stripe.customers.create({
      email: customer_email,
      name: customer_name,
    });

    // Create a payment intent
    const intent = await stripe.paymentIntents.create({
      amount: price.toFixed(0),
      currency,
      payment_method,
      confirm: true,
      description: `Payment from ${card_holder_name}`,
      return_url: 'http://localhost:5173', // Replace with your desired success URL
      receipt_email: customer_email, // Customer email for receipt
      customer: customer.id, // Customer ID
    });

    

    const capturedOrder = new CapturedOrder({
      orderID : customer.id,
      jsonResponse : intent,
      httpStatusCode : 201,
      userProvidedData: values,
    });
    await capturedOrder.save();

    const emailTo = values.email.trim()

    const mail = await fetch("https://correctvin-api.onrender.com/api/send-email", {
    // const mail = await fetch("http://localhost:5000/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${EMAIL_USER}`,
        subject: `CorrectVin Order Summary (Order# ${customer.id})`,
        to: emailTo,
        userInfo: values,
        report,
        price: (price / 100),
        symbol,
        orderId: customer.id,
        transactionId: intent.id,
        orderDate:
          intent.created,
      }),
    });

    const mailUs = await fetch("https://correctvin-api.onrender.com/api/send-email", {
    // const mailUs = await fetch("http://localhost:5000/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${EMAIL_USER}`,
        to: `${EMAIL_USER}`,
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

    // Payment successful
    res.status(200).json({ success: true, message: "Payment successful", intent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
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
  stripeCheckout
  getSingleUser,
};
