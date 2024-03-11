import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    default:"correct vin admin"
  },
  email: {
    type: String,
    default : "correctvinadmin@gmail.com"
  },
  password: {
    type: String,
    required: true,
  },
  created_on: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updated_on: {
    type: Date,
    required: true,
    default: Date.now,
  }
});

const userModel = mongoose.model("user", userSchema);

export default userModel;