const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testModels() {
    const apiKey = "AIzaSyCoY9tRsRQH1AhRjOwdkmCj3w_vcjnANMs"; // Using the gemini key from history
    const genAI = new GoogleGenerativeAI(apiKey);

    const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];

    for (const modelName of models) {
        console.log(`Testing model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, are you working?");
            console.log(`✅ ${modelName} works! Response: ${result.response.text().substring(0, 20)}...`);
            process.exit(0);
        } catch (error) {
            console.log(`❌ ${modelName} failed: ${error.message}`);
        }
    }
    process.exit(1);
}

testModels();
