import Express from "express";
import { capture, getAllUsers, getSingleUser, order, sendEmail, userLogin } from "../Controller/index.js";
import { validateEmailFields } from "../utils/index.js";
import authMiddleware from "./Middlewares/index.js";

const router = Express.Router();

router.post("/api/orders", order);
router.post("/api/orders/:orderID/capture", capture);
router.post('/api/send-email', [validateEmailFields], sendEmail);
router.post('/api/login', userLogin);
router.get('/api/users', [authMiddleware], getAllUsers);
router.get('/api/user/:id', [authMiddleware], getSingleUser);

export default router;
