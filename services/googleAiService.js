
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// Get your API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Function to convert a file to a generative part
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

async function getAiExtraction(imagePath) {
  // For text-and-image input, use the gemini-pro-vision model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const prompt = `
    Analyze the content of the image provided. Extract all key information, including dates, times, branch details, and specifically, any rate card information (like currency exchange rates).

    Structure the extracted data as a single JSON object.

    Within the JSON object, include:
    - Any general information found (like "date", "time", "branch"). If a piece of information like "branch" is not present in the image, you can omit that key or provide an empty string value (e.g., "branch": "").
    - If rate card data is present, include a nested JSON object specifically for "rates", listing currencies and their corresponding values. Ensure rate values are numbers.

    Ensure the output is *only* the JSON object.

    Example JSON structure:
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM AM/PM",
      "branch": "Branch Name/Address",
      "rates": {
        "Currency1": Value1,
        "Currency2": Value2
      },
      "other_details": "Any other significant text or data from the image"
    }

    Return only the JSON object.
  `;

  const imagePart = fileToGenerativePart(imagePath, "image/jpeg");

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  const text = response.text();
  
  // Clean the response to ensure it's valid JSON
  const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Error parsing JSON from AI response:", e);
    console.error("Raw response:", cleanedText);
    throw new Error("Failed to parse AI response as JSON.");
  }
}

module.exports = { getAiExtraction };
