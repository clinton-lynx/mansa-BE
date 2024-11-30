const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const dotenv = require('dotenv').config();
const cors = require('cors');  // Import cors
const path = require('path');
const OpenAI = require('openai');
// const dotenv = require('dotenv');
const fs = require('fs');
// const multer = require('multer');
const fetch = require('node-fetch');
// const { Configuration, OpenAIApi } = require("openai");

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for a specific origin
const corsOptions = {
  origin: 'https://mansa-pay-fe.vercel.app', // Allow requests from any origin
  // origin: 'http://localhost:5173', // Allow requests from any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
  credentials: true,  
};


const multer = require("multer");   
const { Configuration, OpenAIApi }  = require("openai");


app.use(cors(corsOptions));

app.use(express.json());

const MODEL_NAME = "gemini-pro";
const API_KEY = process.env.API_KEY;




// Generate natural language sentences from campaign details
function generateCampaignInfo(data) {
  console.log(data);
  const campaignInfo = [];

  // Extract and format the campaign details
  const { campaign, totalcampaignamountreceived, paymentmade } = data;
  console.log(campaign)
  if (campaign) {
      campaignInfo.push(`The campaign title is "${campaign.title}".`);
      campaignInfo.push(`Description: "${campaign.description}".`);
      campaignInfo.push(`The price per payment is ₦${campaign.price }.`);
      campaignInfo.push(`The due date for this campaign is ${new Date(campaign.duedate).toDateString()}.`);
      campaignInfo.push(`Campaign was created on ${new Date(campaign.created_at).toDateString()}.`);
  }

  // Add the total payments information
  if (totalcampaignamountreceived !== undefined) {
      campaignInfo.push(`The total amount received for this campaign is ₦${totalcampaignamountreceived.toLocaleString()}.`);
  }

  // Loop through each payment entry to add individual payer details
  if (paymentmade && paymentmade.length > 0) {
      paymentmade.forEach((payment, index) => {
          campaignInfo.push(
              `Payer ${index + 1}: ${payment.payer_name} made a payment of ₦${payment.amount} using ${payment.payment_method} on ${new Date(payment.created_at).toDateString()}.` +
              ` Reference ID is ${payment.reference}.`
          );
      });
  } else {
      campaignInfo.push("No individual payments have been recorded for this campaign.");
  }

  return campaignInfo.join(" ");
}


async function runChat(userInput, campaignDetails) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1000,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    // ... other safety settings
  ];
  const campaignContext = generateCampaignInfo(campaignDetails);
  console.log(campaignDetails);
  console.log(campaignContext);
  
  // Use campaignDetails to customize the chat history
  const chatHistory = [
    { role: "user", parts: [{ text: `you are mansa AI, heres what you should know already you are a chat pal in a crowdfunding appliccation called mansapay:,Features
Our Team
Use Cases
Harness the Power of smart Crowdfunding withMansaPay.
MansaPay simplifies crowdfunding with an innovative approach that combines payment automation and AI-driven insights, delivering greater transparency, efficiency, and community impact.

hero img
Why Choose MansaPay?
Discover what makes MansaPay the ultimate choice for crowdfunding with AI-driven insights, community empowerment, and flexibility to scale with your project’s needs.

AI-Powered Assistance
AI-Powered Assistance
Leverage our AI assistant for instant answers to contributor inquiries and campaign performance updates. Provide transparency and support, building trust with your community.

Effortless Payment Links
Effortless Payment Links
Create and share payment links with ease. MansaPay simplifies payment collection, letting you focus on making an impact while we handle the logistics.

Scalable for Any Campaign
Scalable for Any Campaign
Whether for small projects or large initiatives, MansaPay adapts to your funding needs, providing flexibility for campaigns of any size.

Use Cases
Discover how MansaPay can transform community and individual-driven campaigns across various needs.


Event Crowdfunding
Event Crowdfunding
MansaPay makes it easy to fund community events, workshops, and festivals. Supporters can contribute seamlessly, and organizers can monitor progress at every stage.


Tools and APIs Used
Explore the technology stack that makes MansaPay secure, scalable, and innovative.

Frontend
React
React
Builds interactive UIs with powerful components.

Figma
Figma
Designs sleek and user-friendly interfaces.

NextUI
NextUI
Provides ready-to-use, customizable UI components.

Tailwind CSS
Tailwind CSS
Enables rapid styling with a utility-first approach.

Backend
Laravel
Laravel
Robust backend framework for scalable applications.

PHP
PHP
Server-side scripting language powering the backend.

Integrations
OpenAI GPT
OpenAI GPT
Powers AI-driven insights and customer support.

Payaza API
Payaza API
Manages secure payments and transactions.

Our Team
Adeoti Clinton [Lynx] profile picture
Adeoti Clinton [Lynx]
Software Engineer [Frontend]

Leading the MansaPay project with a vision for community impact, Clinton also built the frontend interface and manages product strategy, team coordination, and pitch materials.

Olayori Latubosun profile picture
Olayori Latubosun
Backend Developer & Payment Integration Specialist

Focused on implementing secure payment flows and handling server-side logic. Responsible for API integration and ensuring the backend supports seamless transactions.

Features
Our Team
Use Cases  Here's what I know about the campaign: ${campaignContext} `} ] },
    { role: "model", parts: [{ text: `Hello, I'm Mansa ai. Ask me whattever youll like to know about ${campaignDetails.title || "This "} campaign.`} ] },
    { role: "user", parts: [{ text: `hi`} ] },
    { role: "model", parts: [{ text: `Hello, I'm Mansa ai. Ask me whattever youll like to know about ${campaignDetails.title || "This "} campaign. `} ] },
    { role: "user", parts: [{ text: userInput }] }, // user message
  ];

  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: chatHistory,
  });

  const result = await chat.sendMessage(userInput);
  const response = result.response;
  return response.text();
}

// Simple GET request for testing if the server is live
app.get('/', (req, res) => {
  res.send("test")
});

// POST request for chat (existing endpoint)
app.post('/chat', async (req, res) => {
  console.log("Chat endpoint hit");

  try {
    console.log("hitted");
    
    const { userInput, campaignDetails } = req.body;
    console.log("Received campaignDetails from chat:", campaignDetails); // Log the incoming data
    if (!userInput || !campaignDetails) {
      return res.status(400).json({ error: 'Invalid request body, missing userInput or campaignDetails' });
    }

    const response = await runChat(userInput, campaignDetails);
    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});











// POST request for enhancing campaign titles (new endpoint)
app.post('/enhance-title', async (req, res) => {
  console.log("Enhance Title endpoint hit");

  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Invalid request body, missing title' });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 1,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 100,
    };

    // History for the AI prompt, focusing on title enhancement
    const chatHistory = [
      { role: "user", parts: [{ text: `This is a crowdfunding application called MansaPay. Enhance the following campaign title to make it more engaging and impactful and not more than 5 words, focusing on the personal story: "${title}" and return response in markdown` }] }
    ];

    const chat = model.startChat({
      generationConfig,
      history: chatHistory,
    });

    const result = await chat.sendMessage(title);
    const enhancedTitle = result.response.text();
// Clean up the AI response to remove formatting like **
const cleanedEnhancedTitle = enhancedTitle.replace(/\*\*/g, '').trim();

// Send plain text response
res.json({ enhancedTitle: cleanedEnhancedTitle });
  } catch (error) {
    console.error('Error in enhance-title endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/enhance-description', async (req, res) => {
  console.log("Enhance Description endpoint hit");

  try {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Invalid request body, missing description' });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 1,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 300,
    };

    // History for the AI prompt, focusing on description enhancement
    const chatHistory = [
      { 
        role: "user", 
        parts: [{ 
          text: `This is a crowdfunding application called MansaPay. Enhance the following campaign description to make it more engaging, focusing on the personal story and inspiring potential donors: "${description}"` 
        }] 
      }
    ];

    const chat = model.startChat({
      generationConfig,
      history: chatHistory,
    });

    const result = await chat.sendMessage(description);
    const enhancedDescription = result.response.text().replace(/\*\*/g, '').trim();

    // Respond with the enhanced description
    res.json({ enhancedDescription });
  } catch (error) {
    console.error('Error in enhance-description endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST request for campaign analytics summary (new endpoint)
app.post('/generate-analytics-summary', async (req, res) => {
  console.log("Analytics Summary endpoint hit");

  try {
    const { campaignDetails } = req.body;
    console.log("Received campaignDetails:", campaignDetails); // Log the incoming data
    if (!campaignDetails) {
      return res.status(400).json({ error: 'Invalid request body, missing campaignDetails' });
    }

    const campaignContext = generateCampaignInfo(campaignDetails);  // Reusing existing function to generate the campaign info
    console.log("Generated campaign context:", campaignContext);
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 500,
    };

    const chatHistory = [
      { 
        role: "user", 
        parts: [{ text: `Provide a detailed yet concise not more than 55 words summary of the campaign's performance based on the following details. Highlight key metrics such as total funds raised, percentage completion of the goal, notable dates (creation and due date), and any significant trends or patterns in payments received. Include insights that could be valuable for campaign optimization or further action: ${campaignContext}` }] 
      }
    ];

    const chat = model.startChat({
      generationConfig,
      history: chatHistory,
    });

    const result = await chat.sendMessage(campaignContext);
    const analyticsSummary = result.response.text().replace(/\*\*/g, '').trim();

    res.json({ analyticsSummary });
  } catch (error) {
    console.error('Error in analytics-summary endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});














