import mongoose from "mongoose";
const capturedOrderSchema = new mongoose.Schema({
    orderID: String,
    jsonResponse: Object,
    httpStatusCode: Number,
    userProvidedData: Object,
    captureDate: {
      type: Date,
      default: Date.now
    }
  });
  const CapturedOrder = mongoose.model('CapturedOrder', capturedOrderSchema);

export default CapturedOrder