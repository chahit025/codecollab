import express from 'express';
import { getAIResult, getCodeReviewResult } from '../controller/aiController.js';

const router = express.Router();

router.get('/get-result', getAIResult);
router.post('/get-code-review', getCodeReviewResult);

export default router;
