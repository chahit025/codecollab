import { generateResult, getCodeReview } from '../Services/aiServices.js';

export const getAIResult = async (req, res) => {
  try {
    const { prompt } = req.query;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const result = await generateResult(prompt);
    res.send(result);
  } catch (err) {
    console.error('AI Controller Error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getCodeReviewResult = async (req, res) => {
  try {
    const { code, filename } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }

    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }

    const result = await getCodeReview(code, filename);
    res.json(result);
  } catch (error) {
    console.error('Error in getCodeReview:', error);
    res.status(500).json({ error: 'An error occurred while processing the code review request.' });
  }
};
