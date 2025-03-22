import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-lite-001"
});

const getLanguageFromFile = (filename) => {
  const extension = filename.split('.').pop().toLowerCase();
  const languageMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    rs: 'rust',
    sh: 'bash',
    md: 'markdown',
    html: 'html',
    css: 'css',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml'
  };
  return languageMap[extension] || 'text';
}

export const generateResult = async (prompt) => {
  try {
    if (!prompt || prompt.trim() === '') {
      throw new Error('Empty prompt received');
    }

    // Add the system instruction as part of the prompt
    const fullPrompt = `You are an expert in coding. Please format your responses using markdown with proper code highlighting. Always provide a clear explanation of the code and concepts. Keep responses concise and focused, but include:
    - Brief explanation of the concept/solution
    - Code examples with syntax highlighting
    - Key points or important considerations
    Here's the user's question:\n\n${prompt}`;

    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  } catch (error) {
    console.error('AI Service Error:', error);
    throw new Error(`AI Service Error: ${error.message}`);
  }
}

// Add this new function for code review
export const getCodeReview = async (code, filename) => {
  try {
    if (!code || code.trim() === '') {
      throw new Error('Empty code received');
    }

    const prompt = `Please review the following code and provide feedback in the following format:
  
## Code Review

### Strengths
- List key strengths of the code

### Areas for Improvement
- List specific areas that need improvement

### Recommendations
- Provide actionable recommendations

### Code Examples
\`\`\`${getLanguageFromFile(filename)}
// Show improved code examples
\`\`\`

Code to review:
\`\`\`${getLanguageFromFile(filename)}
${code}
\`\`\`

Remember to:
- Be specific and detailed in your explanations
- Provide concrete examples
- Explain the reasoning behind each suggestion
- Focus on both immediate fixes and long-term improvements
- Format your response with proper markdown
- Use bold for important points
- Use proper spacing between sections
- Ensure code blocks are properly formatted with correct indentation preserved`;

    // Use the same approach as generateResult function for consistency
    const result = await model.generateContent(prompt);
    
    // Process the response to ensure proper formatting
    const text = result.response.text();
    
    // Enhanced formatting for better readability
    return text
      // Preserve code blocks with proper formatting and syntax highlighting
      .replace(/```([\w]*)([\s\S]*?)```/g, (match, language, code) => {
        // Clean up the code to ensure proper indentation is preserved
        const cleanCode = code.replace(/^\s+/gm, (spaces) => spaces);
        return `<div class="code-block"><pre class="language-${language || 'text'}"><code>${cleanCode}</code></pre></div>`;
      })
      // Make headings bold and add proper spacing
      .replace(/### (.*)/g, '<h3 class="review-heading"><strong>$1</strong></h3>')
      .replace(/## (.*)/g, '<h2 class="review-title"><strong>$1</strong></h2>')
      // Add proper spacing between paragraphs
      .replace(/\n\n/g, '</p><p class="review-paragraph">')
      // Format list items
      .replace(/- (.*)/g, '<li class="review-list-item">$1</li>')
      // Wrap lists in proper HTML
      .replace(/<li class="review-list-item">(.*?)<\/li>(\s*<li class="review-list-item">.*?<\/li>)*/gs, '<ul class="review-list">$&</ul>')
      // Add emphasis to important points
      .replace(/\*\*(.*?)\*\*/g, '<em><strong>$1</strong></em>');
  } catch (error) {
    console.error('AI Code Review Error:', error);
    throw new Error(`AI Code Review Error: ${error.message}`);
  }
}
