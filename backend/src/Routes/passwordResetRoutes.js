import express from 'express';
import { generateResetToken, resetPassword } from '../Services/userServices.js';
import { sendResetPasswordEmail } from '../Services/emailService.js';

const router = express.Router();

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await generateResetToken(email);
    
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${result.resetToken}`;
    const emailResult = await sendResetPasswordEmail(email, resetLink);

    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const result = await resetPassword(token, newPassword);
    
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
