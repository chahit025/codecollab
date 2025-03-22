import { Router } from "express";
import { loginUserController, createUserController, logoutController, getUserProfileController, forgotPassword, resetPassword }  from '../controller/userControllers.js'
import {body, check} from 'express-validator';
import {verifyToken} from '../middleware/authMiddlewares.js'

const router = Router();

router.post('/register',
  body('username').isLength({min: 3}).withMessage('Username must be at least 3 characters long'),
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password').isLength({min: 3}).withMessage('Password must be at least 3 characters long'),
 createUserController);

 router.post('/login',
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password').isLength({min: 3}).withMessage('Password must be at least 3 characters long'),
 loginUserController);   

 router.get('/logout',verifyToken, logoutController);

// Add the new profile route
router.get('/profile', verifyToken, getUserProfileController);



export default router;