const OpenAI = require('openai');
const roomService = require('./otherServices');
const sequelize = require('../config/database');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.API_KEY, 
});

const processMessage = async (messages) => {
    try {
        const userMessage = messages[messages.length - 1].content.toLowerCase();
        console.log('Messages:', JSON.stringify(messages));
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a friendly assistant for a hotel booking service. When someone greets you, reply with a greeting and offer help with booking hotel rooms. Use emojis in your messages and organize information clearly. If asked to show all room options, call the getRoomOptions function. Politely steer the conversation back to hotel booking if it goes off-topic. Give detailed room information and recommendations based on user preferences. When booking a room, display all options with line breaks and ensure to collect name, email, and number of nights before saving the booking. If information is missing, ask for it, confirm the booking, and then call the bookRoom function, presenting the response with bullet points and emojis. Interact like a friend and use casual language."
                },
                ...messages
            ],
            functions: [
                {
                    name: "get_room_options",
                    description: "Retrieve available room options",
                    parameters: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                },
                {
                    name: "book_room",
                    description: "Make a room reservation",
                    parameters: {
                        type: "object",
                        properties: {
                            roomId: { type: "integer" },
                            fullName: { type: "string" },
                            email: { type: "string" },
                            nights: { type: "integer" }
                        },
                        required: ["roomId", "fullName", "email", "nights"]
                    }
                }
            ],
            function_call: "auto"
        });
        console.log('Received response from OpenAI API:', JSON.stringify(completion));
        if (!completion.choices || completion.choices.length === 0) {
            throw new Error('No response from OpenAI API');
        }
        const responseMessage = completion.choices[0].message;
        if (!responseMessage) {
            throw new Error('Invalid response structure from OpenAI API');
        }
        if (responseMessage.function_call) {
            const functionName = responseMessage.function_call.name;
            const functionArgs = JSON.parse(responseMessage.function_call.arguments);
            console.log(`Function call detected: ${functionName}`);
            console.log('Function arguments:', functionArgs);

            let functionResult;
            if (functionName === "get_room_options") {
                functionResult = await roomService.getRoomOptions();
            } else if (functionName === "book_room") {
                functionResult = await roomService.bookRoom(functionArgs.roomId, functionArgs.fullName, functionArgs.email, functionArgs.nights);
            }

            console.log('Function result:', functionResult);

            const secondResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    ...messages,
                    responseMessage,
                    {
                        role: "function",
                        name: functionName,
                        content: JSON.stringify(functionResult)
                    }
                ]
            });
            console.log('Received second response: ', JSON.stringify(secondResponse));
            if (!secondResponse.choices || secondResponse.choices.length === 0) {
                throw new Error('No response from OpenAI API');
            }
            return secondResponse.choices[0].message.content;
        }
        if (!responseMessage.content) {
            return "I'm terribly sorry, I can't assist you with your response. Can I help you with booking a room?";
        }
        return responseMessage.content;
    } catch (error) {
        console.error('Error in OpenAI service:', error);
        if (error.response) {
            console.error('OpenAI API error response:', error.response.data);
        } else if (error.message.includes('No response from OpenAI API')) {
            return "The OpenAI service is currently unavailable. Please try again later.";
        }
        throw error;
    }
};
module.exports = { processMessage };
