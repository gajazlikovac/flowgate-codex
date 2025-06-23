// src/services/pdfProcessor.js
import geminiService from './GeminiService';
import { pdfjs } from 'react-pdf';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// PDF API configuration - Updated to use deployed backend URL
const pdfApiUrl = process.env.REACT_APP_PDF_API_URL || 'https://express-js-866853235757.europe-west3.run.app/api';

// Function to extract text from PDF using server-side processing
export const extractTextFromPdf = async (file) => {
  const formData = new FormData();
  formData.append('pdf', file);
  
  console.log(`Sending PDF to server for extraction: ${file.name} (${file.size} bytes)`);
  
  try {
    const response = await fetch(`${pdfApiUrl}/extract-pdf-text`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully extracted ${data.text.length} characters of text`);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
};

// Process extracted text with dedicated PDF Gemini endpoint
export const processWithGeminiAPI = async (text, selectedStandards, standardsMap) => {
  // Format the standards list for the prompt
  const standardsText = selectedStandards
    .map(id => standardsMap.find(s => s.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  
  console.log(`Processing text (${text.length} chars) with PDF Gemini API`);
  console.log(`Selected standards: ${standardsText}`);
  
  const prompt = `
    Analyze the following text from a sustainability report and extract sustainability goals.
    The organization is interested in compliance with: ${standardsText}.
    
    For each sustainability goal you identify, categorize it into one of these pillars:
    1. Environment (id: env) - for environmental sustainability goals
    2. Social (id: soc) - for social responsibility goals
    3. Governance & Compliance (id: gov) - for regulatory compliance and governance goals
    
    For each goal, provide:
    - A short, clear title
    - A detailed description
    - The appropriate category (energy, emissions, waste, water, biodiversity, social, governance, compliance, regulatory)
    - Any specific targets mentioned
    - A target date if specified (in YYYY-MM-DD format, default to end of year if only year is mentioned)
    
    Format your response as a structured JSON array with the following structure:
    [
      {
        "pillarId": "env",
        "title": "Reduce Carbon Emissions",
        "description": "Decrease scope 1 and 2 emissions by 30% by 2030",
        "category": "emissions",
        "due_date": "2030-12-31",
        "targets": ["30% reduction by 2030", "carbon neutrality by 2050"]
      },
      {
        "pillarId": "soc",
        "title": "Improve Workforce Diversity",
        "description": "Increase representation of underrepresented groups in leadership",
        "category": "social",
        "due_date": "2025-12-31",
        "targets": ["40% diverse leadership by 2025"]
      }
    ]
    
    Text to analyze:
    ${text}
  `;

  try {
    console.log("Sending prompt to PDF Gemini API endpoint");
    
    const response = await fetch(`${pdfApiUrl}/gemini-extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Successfully received Gemini API response");
    
    // Process Gemini response
    if (data && data.predictions && data.predictions[0]) {
      const content = data.predictions[0].content;
      console.log("Gemini content:", content.substring(0, 200) + "...");
      
      // Extract the JSON part from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        console.log("Found JSON in response");
        
        // Parse the JSON and format as needed for your component
        const parsedGoals = JSON.parse(jsonMatch[0]);
        console.log(`Parsed ${parsedGoals.length} goals from Gemini`);
        
        // Transform to match your component's data structure
        return parsedGoals.map((goal, index) => ({
          id: `${goal.pillarId}-goal-${Date.now()}-${index}`,
          pillarId: goal.pillarId,
          title: goal.title,
          description: goal.description,
          category: goal.category,
          progress: 0,
          due_date: goal.due_date || '2030-12-31',
          targets: goal.targets.map(target => ({
            name: target,
            status: 'Not started',
            progress: 0
          }))
        }));
      }
    }
    
    return []; // Return empty array if no structured data was found
  } catch (error) {
    console.error('Error calling PDF Gemini API:', error);
    throw error;
  }
};

// Extract text from PDF using PDF.js in the browser (fallback method)
export const extractTextFromPdfInBrowser = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text in browser:", error);
    throw new Error(`Error extracting PDF text: ${error.message}`);
  }
};

// Get default standards-based goals
export const getDefaultStandardsBasedGoals = (standards) => {
  const standardsGoals = [];
  
  if (standards.includes('eu-taxonomy')) {
    standardsGoals.push({
      pillarId: 'env',
      title: "EU Taxonomy Climate Change Mitigation",
      description: "Ensure activities substantially contribute to climate change mitigation according to EU Taxonomy criteria",
      category: "emissions",
      due_date: "2025-12-31",
      targets: [{name: 'Compliance with technical screening criteria for climate change mitigation', status: 'Not started', progress: 0}]
    });
  }
  
  if (standards.includes('eu-code-of-conduct')) {
    standardsGoals.push({
      pillarId: 'env',
      title: "Data Center Energy Efficiency",
      description: "Improve data center energy efficiency in accordance with the EU Code of Conduct",
      category: "energy",
      due_date: "2026-12-31",
      targets: [{name: 'Reduce PUE to below 1.5', status: 'Not started', progress: 0}]
    });
  }
  
  if (standards.includes('eed')) {
    standardsGoals.push({
      pillarId: 'env',
      title: "Energy Efficiency Directive Compliance",
      description: "Implement measures to comply with Energy Efficiency Directive requirements",
      category: "energy",
      due_date: "2025-12-31",
      targets: [{name: 'Complete energy audit every 4 years', status: 'Not started', progress: 0}]
    });
  }
  
  if (standards.includes('iso-27001')) {
    standardsGoals.push({
      pillarId: 'gov',
      title: "ISO 27001 Information Security",
      description: "Maintain ISO 27001 certification for information security management",
      category: "compliance",
      due_date: "2024-12-31",
      targets: [{name: 'Annual ISO 27001 compliance audit', status: 'Not started', progress: 0}]
    });
  }
  
  if (standards.includes('iso-14001')) {
    standardsGoals.push({
      pillarId: 'env',
      title: "ISO 14001 Environmental Management",
      description: "Implement and maintain environmental management system in accordance with ISO 14001",
      category: "environmental",
      due_date: "2024-12-31",
      targets: [{name: 'Annual ISO 14001 certification review', status: 'Not started', progress: 0}]
    });
  }
  
  if (standards.includes('iso-9001')) {
    standardsGoals.push({
      pillarId: 'gov',
      title: "ISO 9001 Quality Management",
      description: "Implement and maintain quality management system in accordance with ISO 9001",
      category: "governance",
      due_date: "2024-12-31",
      targets: [{name: 'Annual ISO 9001 certification review', status: 'Not started', progress: 0}]
    });
  }
  
  return standardsGoals;
};

// Process a PDF file completely
export const processPdfFile = async (file, selectedStandards, standardsMap) => {
  try {
    console.log("Starting to process file:", file.name);
    
    // Extract text from the PDF
    let pdfText;
    try {
      // Try server-side extraction first
      pdfText = await extractTextFromPdf(file);
    } catch (error) {
      console.warn("Server-side extraction failed, falling back to browser extraction:", error);
      // Fall back to browser-side extraction
      pdfText = await extractTextFromPdfInBrowser(file);
    }
    
    console.log(`Successfully extracted text from ${file.name}, length: ${pdfText.length} chars`);
    
    // Process with Gemini to extract and categorize sustainability goals
    const goals = await processWithGeminiAPI(pdfText, selectedStandards, standardsMap);
    
    return goals;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error(`Failed to process the PDF file: ${error.message}`);
  }
};

export default {
  extractTextFromPdf,
  processWithGeminiAPI,
  extractTextFromPdfInBrowser,
  getDefaultStandardsBasedGoals,
  processPdfFile
};