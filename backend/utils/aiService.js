import fetch from 'node-fetch';
import { decryptContent } from './encryption.js';
import dotenv from 'dotenv';

dotenv.config();

// API keys from environment variables
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Log API key status (without revealing the full key)
console.log(`HuggingFace API Key status: ${HUGGINGFACE_API_KEY ? 'Present' : 'Missing'} (${HUGGINGFACE_API_KEY ? HUGGINGFACE_API_KEY.substring(0, 4) + '...' : 'N/A'})`);
console.log(`Gemini API Key status: ${GEMINI_API_KEY ? 'Present' : 'Missing'} (${GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 4) + '...' : 'N/A'})`);

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
    } else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) {
      // For text documents, use document classification
      // Extract plain text from the base64 content (assuming it's text)
      try {
        // If it's base64 text, decode it
        input = Buffer.from(decryptedContent, 'base64').toString('utf-8');
        
        // Truncate if needed
        if (input.length > 5000) {
          input = input.substring(0, 5000) + '...';
        }
      } catch (error) {
        // If decoding fails, use the original content
        input = decryptedContent.substring(0, 5000) + '...';
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
      body: JSON.stringify({ inputs: input })
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
      // Format the prompt for image analysis
      prompt = `Analyze this image in detail. Describe what you see, identify key elements, and provide any relevant insights about the contents.`;
      
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
          temperature: 0.4,
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
          `This is an image analysis request. The image is of type ${file.type} and file name is ${file.name}. Please provide a general analysis template that could apply to this type of file.`);
      }
      
    } else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) {
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
        // If decoding fails, use minimal content
        input = "Unable to decode file content.";
      }
      
      // Format the prompt for document analysis
      prompt = `Analyze this document and provide a comprehensive summary. Identify key topics, main points, and any significant insights. Extract relevant entities, dates, and numerical data if present.\n\nDocument content:\n${input}`;
      
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
      temperature: 0.4,
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