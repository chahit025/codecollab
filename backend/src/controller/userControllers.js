import * as userService from '../Services/userServices.js';
import {validationResult} from 'express-validator';
import clientRedis from '../Services/redisServices.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

//create user controller for registering a user
export const createUserController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try{
    const user = await userService.createUser(req.body);
    //generate token for the user 
    const token = user.generateJWT();
    //delete the password from the user object before sending it to the client
    delete user._doc.password;

    res.status(201).json({user, token});
  }catch(error){
    res.status(400).json({message: error.message});
  }
};

//create login controller for logging in a user 
export const loginUserController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try{
    const { email, password } = req.body;
    const user = await userService.findOne({ email });
    if(!user){
      return res.status(404).json({message: "User not found"});
    }
    const isMatch = await userService.isValidPassword(password, user.password);
    if(!isMatch){
      return res.status(400).json({message: "Invalid credentials"});
    }
     //if all well generate token
     const token = user.generateJWT();
     
     // Set token in cookie
     res.cookie('token', token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'lax',
       maxAge: 60 * 60 * 1000 // 1 hour
     });
     
     //delete password from user object
     delete user._doc.password;
     res.status(200).json({ user, token });
 
   } catch (error) {
     console.error("Login error:", error);
     res.status(400).json({ error: error.message });
   }
 };

 //create logout controller for logging out a user
export const logoutController = async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    // Use promisify or await with proper error handling
    await clientRedis.set(token, 'logout', 'EX', 60 * 60 * 24);

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error during logout' });
  }
}

// Add this new controller
export const getUserProfileController = async (req, res) => {
  try {
    const user = await userService.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Remove sensitive information
    const userProfile = {
      _id: user._id,
      username: user.username,
      email: user.email
    };
    res.status(200).json({ user: userProfile });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Error fetching user profile" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email, username } = req.body;
    const user = await userService.findOne({ email, username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save token to database
    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    res.status(200).json({ message: "Password reset link sent to email" });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: "Error processing request" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token from params to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await userService.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() }
    }).select('+password +resetToken +resetTokenExpiry');

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Update password
    user.password = await userService.hashPassword(password);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: "Error resetting password" });
  }
};
