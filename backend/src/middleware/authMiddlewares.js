import jwt from "jsonwebtoken";
import clientRedis from '../Services/redisServices.js'

export const verifyToken = async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    let token = req.cookies.token;
    
    // Check Authorization header if no cookie token
    const authHeader = req.headers.authorization;
    if (!token && authHeader) {
      // Handle both "Bearer token" and raw token formats
      token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    // Check if token is blacklisted
    try {
      const isBlacklisted = await clientRedis.get(token);
      if (isBlacklisted) {
        res.cookie('token', '', { expires: new Date(0) });
        return res.status(401).json({ error: "Unauthorized - Token revoked" });
      }
    } catch (redisError) {
      console.error("Redis error:", redisError);
      // Continue even if Redis check fails
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Store decoded user information in the request
      req.user = decoded;
      
      // Continue to the next middleware or route handler
      next();
    } catch (jwtError) {
      console.error("Token verification failed:", jwtError);
      
      // Clear the invalid token
      res.cookie('token', '', { expires: new Date(0) });
      
      // Return an Unauthorized response with more specific error
      return res.status(401).json({ 
        error: "Unauthorized - Invalid token", 
        details: jwtError.message 
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};