import User from "../models/userSchema.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const createUser = async ({ email, password, username }) => {
  if (!email || !password || !username) {
    return { error: "username, Email and password are required" };
  }
  const hashedPassword = await hashPassword(password);
  const user = await User.create({ username, email, password: hashedPassword });
  return user;
};

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

export const findOne = async (query) => {
  return await User.findOne(query).select('+password');
};

export const isValidPassword = async (password, userPassword) => {
  return await bcrypt.compare(password, userPassword);
};

export const generateResetToken = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    return { error: "No user found with this email address" };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = await bcrypt.hash(resetToken, 10);

  user.resetToken = hashedToken;
  user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
  await user.save();

  return { success: true, resetToken, user };
};

export const resetPassword = async (token, newPassword) => {
  const user = await User.findOne({
    resetToken: { $exists: true },
    resetTokenExpiry: { $gt: Date.now() }
  }).select('+resetToken +resetTokenExpiry');

  if (!user) {
    return { error: "Invalid or expired reset token" };
  }

  const hashedPassword = await hashPassword(newPassword);
  user.password = hashedPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  return { success: true };
};