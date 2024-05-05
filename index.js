import express from "express";
import cors from "cors"
import "dotenv/config";
import router from "./Routes/routes.js";
import mongoose from "mongoose";




const app = express();
const  PORT = process.env.PORT || 5000




// host static files
app.use(express.static("client"));

// parse post params sent in body in json format
app.use(express.json());
app.use(cors())
app.use(router)



mongoose.connect(process.env.DB_URI);
mongoose.connection.on("connected", () => console.log("MongoDB Connected"));
mongoose.connection.on("error", (err) => console.log("MongoDB Error", err));



app.get("/" , (req,res)=>{
  res.status(200).json("correctVin Backend")
})

// listner
app.listen(PORT, () => {
  console.log(`Node server listening at http://localhost:${PORT}`);
});
