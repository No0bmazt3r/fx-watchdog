// This service simulates a call to a real AI/OCR service.

const getOcrExtraction = async (image) => {
  // In a real application, you would send the image to an external service.
  // For this simulation, we'll return a hardcoded JSON response based on your sample output.
  console.log(`[AIService] Simulating OCR and LLM extraction for image: ${image.filename}`);

  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return [
    {
      "image_index": 0,
      "date": "29/07/2025",
      "rates": {
        "INR (ACC)": 20.342676,
        "BDT (ACC)": 29.100591,
        "BDT (PIN)": 28.345562,
        "NPR (ACC/PIN)": 32.520603,
        "IDR (ACC)": 3840,
        "PKR (ACC)": 66.68076,
        "PHP (ACC)": 13.414248
      }
    },
    {
      "image_index": 1,
      "date": "29 - JULY - 2025",
      "time": "09.00 AM",
      "branch": "portklang",
      "rates": {
        "BDT ACC": 29.11,
        "BDT PIN": 28.89,
        "BDT ISLAMIC": 29.10,
        "INDONESIA": 259.40,
        "INDIA": 20.45,
        "PAKISTAN": 67.15,
        "NEPAL": 32.78,
        "PHILIPPINES": 13.38,
        "SRI LANKA": 71.09,
        "VIETNAM": 5979,
        "MYANMAR": 1051,
        "THAILAND": 7.58
      }
    }
  ];
};

module.exports = { getOcrExtraction };