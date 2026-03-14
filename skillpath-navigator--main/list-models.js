const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listAllModels() {
    const apiKey = "AIzaSyCoY9tRsRQH1AhRjOwdkmCj3w_vcjnANMs";
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Note: The SDK might not have a direct listModels, so we use the fetch API or similar
        // Actually, let's use a simpler approach. If generateContent fails, we can't do much.
        // But let's try calling a very old one or just check the error again.
        console.log("Attempting to list models via API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log("Models found:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.log("Error listing models:", error.message);
    }
}

listAllModels();
