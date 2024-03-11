import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized user",
      });
    }

    const tokenParts = token.split(" ");

    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      return res.status(401).json({
        status: false,
        message: "Invalid token format",
      });
    }

    const decodedToken = jwt.verify(tokenParts[1], process.env.PRIVATE_KEY);

    if (decodedToken) {
      next();
    } else {
      res.status(401).json({
        status: false,
        message: "Invalid token",

      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export default authMiddleware;