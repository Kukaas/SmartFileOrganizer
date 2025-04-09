import fetch from 'node-fetch';
import { decryptContent } from './encryption.js';
import dotenv from 'dotenv';

dotenv.config();

// API keys from environment variables
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Analyze a file using Hugging Face AI
 * @param {Object} file - File object from database
 * @returns {Object} Analysis results
 */
export const analyzeWithHuggingFace = async (file) => {
  try {
    if (!file.content) {
      throw new Error('File content not available for analysis');
    }

    if (!HUGGINGFACE_API_KEY) {
      throw new Error('Hugging Face API key is missing');
    }
    
    // Decrypt file content
    const decryptedContent = decryptContent(file.content);
    
    // Log content length and type
    const contentPreview = decryptedContent.substring(0, 100).replace(/\n/g, ' ');
    
    // Detect content type and perform appropriate analysis
    let analysisType = 'text-classification';
    let model = 'facebook/bart-large-mnli';
    let input = "";
    
    if (file.type.startsWith('image/')) {
      // For images, use image classification
      analysisType = 'image-classification';
      model = 'google/vit-base-patch16-224';
      
      // For images, we need to pass the base64 content with data URL prefix
      input = `data:${file.type};base64,${decryptedContent}`;
    } else if (file.type.includes('pdf') || 
              file.type.includes('document') || 
              file.name.toLowerCase().endsWith('.pdf') ||
              file.name.toLowerCase().endsWith('.docx') ||
              file.name.toLowerCase().endsWith('.doc') ||
              file.type.includes('text')) {
      // For documents (PDF, DOCX, DOC, text), use zero-shot classification
      // This is more flexible for various document types
      analysisType = 'text-classification';
      
      // Use a more robust model for document understanding
      model = 'facebook/bart-large-mnli';
      
      try {
        // If it's base64 text, decode it
        input = Buffer.from(decryptedContent, 'base64').toString('utf-8');
        
        // For PDFs and DOCX, the content might be binary and not decode properly
        // In that case, we'll rely more on the Gemini analysis which handles binary better
        
        // Truncate if needed - Hugging Face has token limits
        if (input.length > 5000) {
          input = input.substring(0, 5000) + '...';
        }
      } catch (error) {
        console.warn('Error decoding content for Hugging Face analysis:', error);
        // If decoding fails, provide a placeholder for minimal classification
        // The real analysis will be done by Gemini
        input = `File name: ${file.name}. This is a ${file.type} document.`;
      }
    } else {
      // For other file types, skip analysis
      throw new Error(`Unsupported file type for analysis: ${file.type}`);
    }

    // Call Hugging Face API
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        inputs: input,
        // Add candidate_labels for text classification models
        ...(analysisType === 'text-classification' ? {
          parameters: {
            candidate_labels: [
              "business", "education", "technology", "health", "science", 
              "entertainment", "politics", "legal", "personal", "other"
            ]
          }
        } : {})
      })
    });

    const responseText = await response.text();
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Hugging Face response:', e);
      throw new Error(`Invalid response from Hugging Face: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText} - ${JSON.stringify(result)}`);
    }

    // Process the results based on analysis type
    let processedResults = {
      source: 'huggingface',
      analysisType,
      model,
      results: result
    };

    return processedResults;
  } catch (error) {
    console.error('Error analyzing with Hugging Face:', error);
    return {
      source: 'huggingface',
      error: error.message,
      status: 'error'
    };
  }
};

/**
 * Check if a base64 string is valid
 * @param {string} str - The base64 string to check
 * @returns {boolean} - Whether the string is valid base64
 */
function isValidBase64(str) {
  if (!str) return false;
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
}

/**
 * Analyze a file using Google's Gemini API
 * @param {Object} file - File object from database
 * @returns {Object} Analysis results
 */
export const analyzeWithGemini = async (file) => {
  try {
    if (!file.content) {
      throw new Error('File content not available for analysis');
    }

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is missing');
    }
    
    // Decrypt file content
    let decryptedContent;
    try {
      decryptedContent = decryptContent(file.content);
      // Log content length and type
      const contentPreview = decryptedContent.substring(0, 100).replace(/\n/g, ' ');
      
      // Check if decrypted content is valid base64
      if (!isValidBase64(decryptedContent)) {
        console.warn('Warning: Decrypted content is not valid base64');
      }
    } catch (error) {
      console.error('Error decrypting content:', error);
      throw new Error(`Failed to decrypt file content: ${error.message}`);
    }
    
    let input = "";
    let prompt = "";
    
    if (file.type.startsWith('image/')) {
      // For images, use Gemini Vision
      // Format the prompt for image analysis - focus on content
      prompt = `Analyze this image with focus on the actual CONTENT. 
      
Describe in detail:
1. What is shown in the image (people, objects, scenes, etc.)
2. The main subject/focus of the image
3. Any text visible in the image
4. The context or situation depicted
5. The mood, style, or aesthetic of the image

DO NOT focus on technical aspects like resolution or image format unless they're particularly relevant.
FOCUS ONLY on what the image actually shows and what information can be extracted from the visual content.`;
      
      // For Gemini Vision API, we need to format the data correctly
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: file.type,
                data: decryptedContent
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2, // Lower temperature for more factual responses
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      };
      
      
      // Call Gemini Vision API - using the updated model name
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        
        // Check if the response is valid JSON
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse Gemini response:', e);
          throw new Error(`Invalid response from Gemini: ${responseText.substring(0, 100)}`);
        }

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.statusText} - ${JSON.stringify(result)}`);
        }

        return {
          source: 'gemini',
          analysisType: 'image-analysis',
          model: 'gemini-2.0-flash',
          results: result
        };
      } catch (error) {
        console.error('Error calling Gemini Vision API:', error);
        
        return analyzeWithGeminiText(file, decryptedContent, 
          `This is an image named ${file.name}. Please analyze what this image might contain based on its name and provide a thorough description of the probable content.`);
      }
      
    } else if (file.type.includes('pdf') || 
              file.type.includes('document') || 
              file.name.toLowerCase().endsWith('.pdf') ||
              file.name.toLowerCase().endsWith('.docx') ||
              file.name.toLowerCase().endsWith('.doc') ||
              file.type.includes('text')) {
      // For text documents, use Gemini
      try {
        // If it's base64 text, decode it
        input = Buffer.from(decryptedContent, 'base64').toString('utf-8');
        
        // Truncate if needed
        if (input.length > 30000) {
          input = input.substring(0, 30000) + '...';
        }
      } catch (error) {
        console.error('Error decoding file content:', error);
        // For PDF and DOCX, we might have binary content that can't be easily decoded to text
        // Create a more specialized prompt based on file type
        if (file.name.toLowerCase().endsWith('.pdf')) {
          input = `[This is a PDF document named "${file.name}" that couldn't be fully extracted. Please analyze based on filename and available metadata.]`;
        } else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
          input = `[This is a Word document named "${file.name}" that couldn't be fully extracted. Please analyze based on filename and available metadata.]`;
        } else {
          input = `[Unable to decode file content for "${file.name}".]`;
        }
      }
      
      // Format the prompt for document analysis - focus on content
      prompt = `Analyze this document with focus on its ACTUAL CONTENT.

Your analysis should:
1. Identify the main topics and subjects discussed
2. Extract key information, facts, and arguments presented
3. Identify main actors, entities, or stakeholders mentioned
4. Note any conclusions, recommendations, or key takeaways
5. Extract any important data points, statistics, or numerical information

Document type: ${file.name.split('.').pop().toUpperCase()} (${file.type})
Document name: ${file.name}

If the document content appears to be in binary format or contains non-text elements, please analyze what you can and mention that the document may require specialized processing.

DO NOT focus on document metadata, structure, or formatting unless it's relevant to understanding the content.
FOCUS PRIMARILY on what the document is actually about and what information it contains.

Document content:
${input}`;
      
      return analyzeWithGeminiText(file, input, prompt);
    } else {
      // For other file types, skip analysis
      throw new Error(`Unsupported file type for analysis: ${file.type}`);
    }
  } catch (error) {
    console.error('Error analyzing with Gemini:', error);
    return {
      source: 'gemini',
      error: error.message,
      status: 'error'
    };
  }
};

/**
 * Analyze text with Gemini API
 * @param {Object} file - File object
 * @param {string} input - The text input to analyze
 * @param {string} prompt - The prompt to use
 * @returns {Object} Analysis results
 */
async function analyzeWithGeminiText(file, input, prompt) {
  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.2, // Lower temperature for more factual responses
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  };
  
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    
    // Check if response is valid JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Gemini response:', e);
      throw new Error(`Invalid response from Gemini: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText} - ${JSON.stringify(result)}`);
    }

    return {
      source: 'gemini',
      analysisType: 'document-analysis',
      model: 'gemini-2.0-flash',
      results: result
    };
  } catch (error) {
    console.error('Error calling Gemini Text API:', error);
    throw error;
  }
}

/**
 * Summarize a file using Gemini API
 * @param {Object} file - File object from database
 * @returns {Object} Summary results
 */
export const summarizeWithGemini = async (file) => {
  try {
    if (!file.content) {
      throw new Error('File content not available for summarization');
    }

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is missing');
    }

    // Decrypt file content
    let decryptedContent;
    try {
      decryptedContent = decryptContent(file.content);
      // Check if decrypted content is valid base64
      if (!isValidBase64(decryptedContent)) {
        console.warn('Warning: Decrypted content is not valid base64');
      }
    } catch (error) {
      console.error('Error decrypting content:', error);
      throw new Error(`Failed to decrypt file content: ${error.message}`);
    }
    
    let input = "";
    let prompt = "";
    
    if (file.type.startsWith('image/')) {
      // For images, create a summary description
      prompt = `Summarize what this image shows. Focus exclusively on the visual content and create a concise, informative description that captures the key elements, subject matter, and overall impression of the image.

Your summary should:
1. Start with a clear statement of what the image primarily shows
2. Describe the most important elements in 3-5 sentences
3. Mention any relevant context, mood, or significant details
4. Use clear, descriptive language

DO NOT speculate beyond what's visible and DO NOT include technical aspects of the image format.`;
      
      // For Gemini Vision API, format the data correctly
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: file.type,
                data: decryptedContent
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1, // Very low temperature for factual summary
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 1024, // Shorter for summary
        }
      };
      
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        
        // Check if the response is valid JSON
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse Gemini response:', e);
          throw new Error(`Invalid response from Gemini: ${responseText.substring(0, 100)}`);
        }

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.statusText} - ${JSON.stringify(result)}`);
        }

        return {
          source: 'gemini',
          type: 'summary',
          model: 'gemini-2.0-flash',
          results: result
        };
      } catch (error) {
        console.error('Error calling Gemini Vision API for summary:', error);
        return summarizeWithGeminiText(file, `An image named "${file.name}"`);
      }
      
    } else if (file.type.includes('pdf') || 
              file.type.includes('document') || 
              file.name.toLowerCase().endsWith('.pdf') ||
              file.name.toLowerCase().endsWith('.docx') ||
              file.name.toLowerCase().endsWith('.doc') ||
              file.type.includes('text')) {
      // For text documents, summarize the content
      try {
        // If it's base64 text, decode it
        input = Buffer.from(decryptedContent, 'base64').toString('utf-8');
        
        // Truncate if needed
        if (input.length > 30000) {
          input = input.substring(0, 30000) + '...';
        }
      } catch (error) {
        console.error('Error decoding file content for summary:', error);
        // If decoding fails, create specialized handling based on file type
        if (file.name.toLowerCase().endsWith('.pdf')) {
          return summarizeWithGeminiText(file, 
            `A PDF document named "${file.name}" that couldn't be fully extracted. Please provide a summary based on the filename and available metadata.`);
        } else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
          return summarizeWithGeminiText(file, 
            `A Word document named "${file.name}" that couldn't be fully extracted. Please provide a summary based on the filename and available metadata.`);
        } else {
          return summarizeWithGeminiText(file, `A document named "${file.name}"`);
        }
      }
      
      // Create a more specialized prompt based on file type
      let fileTypeSpecificPrompt = "";
      if (file.name.toLowerCase().endsWith('.pdf')) {
        fileTypeSpecificPrompt = "This is a PDF document.";
      } else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
        fileTypeSpecificPrompt = "This is a Word document.";
      } else if (file.type.includes('text')) {
        fileTypeSpecificPrompt = "This is a text document.";
      }
      
      return summarizeWithGeminiText(file, input, fileTypeSpecificPrompt);
    } else {
      // For other file types, use the file name
      return summarizeWithGeminiText(file, `A file named "${file.name}" of type ${file.type}`);
    }
  } catch (error) {
    console.error('Error summarizing with Gemini:', error);
    return {
      source: 'gemini',
      type: 'summary',
      error: error.message,
      status: 'error'
    };
  }
};

/**
 * Summarize text with Gemini API
 * @param {Object} file - File object
 * @param {string} input - The text input to summarize
 * @param {string} fileTypeInfo - Optional information about the file type
 * @returns {Object} Summary results
 */
async function summarizeWithGeminiText(file, input, fileTypeInfo = "") {
  const prompt = `Create a concise summary of the following content. 

Focus EXCLUSIVELY on summarizing the main content, key points, and essential information.

Your summary should:
1. Begin with a clear statement of what the content is about
2. Include the most important facts, ideas, or findings
3. Organize information in order of importance
4. Be concise but comprehensive (around 250-400 words)
5. Use clear, straightforward language

${fileTypeInfo ? fileTypeInfo + '\n' : ''}
File name: ${file.name}
File type: ${file.type || 'Unknown'}

DO NOT include metadata or technical details unless they're central to understanding the content.
DO NOT analyze the document structure or formatting.
FOCUS ONLY on summarizing the actual information.

Content to summarize:
${input}`;

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.1, // Very low temperature for factual summary
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 1024, // Shorter for summary
    }
  };
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    
    // Check if response is valid JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Gemini summary response:', e);
      throw new Error(`Invalid response from Gemini: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText} - ${JSON.stringify(result)}`);
    }

    return {
      source: 'gemini',
      type: 'summary',
      model: 'gemini-2.0-flash',
      results: result
    };
  } catch (error) {
    console.error('Error calling Gemini Text API for summary:', error);
    throw error;
  }
} 