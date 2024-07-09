const OpenAI = require('openai');
const roomService = require('./otherServices');
const sequelize = require('../config/database');
require('dotenv').config();
const sendMail = require('./emailService');

const openai = new OpenAI({
    apiKey: process.env.API_KEY, 
});

const processMessage = async (messages) => {
    try {
        const userMessage = messages[messages.length - 1].content.toLowerCase();
        
        if (['hi', 'hello', 'hey'].includes(userMessage)) {
            return 'Hello! How can I assist you today?';
        }

        console.log('Sending request to OpenAI API...');
        console.log('Messages:', JSON.stringify(messages));

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant for a hotel booking service. If someone greets you, simply greet and say that I can help you out with hotel room booking options and provide some emojis in between the chats always give the chats in ordered manner.If asked about showing all options then call getRoomOptions function to fulfill it. If asked about topics unrelated to hotel booking, politely redirect the conversation. When discussing rooms, provide detailed information and recommendations based on user preferences. When someone asks to book a room, show all the options with a line break for each option and don't save booking without taking name, email, and nights. If someone asks to book a room without providing all the required information, ask for the missing information. After getting all the details, ask the user to confirm the booking and if confirmed, then call the fucntion bookRoom and get the detail from there and provide all the response from there and break line by line put some emoji in the chats make bullets point for all the info get from the booRoom. behave like a friend and can use slang language. You are a helpful and friendly assistant for a hotel booking service . If someone greets you, simply greet and say that I can help you out with hotel room booking options and provide some emojis in between the chats always give the chats in ordered manner. If someone asks for room booking don't simply just ask them their personal information, first ask them their preference and show rooms according to it and if no preference then show them all the available options for rooms and after confirming which room to book then ask their personal information. If asked about topics unrelated to hotel booking, politely redirect the conversation regarding hotel booking. When discussing rooms, provide detailed information and recommendations based on user preferences. When someone asks for room booking then show all the options with breaking line for each option and dont save booking without taking name email and nights. If someone asks to book a room without providing all the required information, ask for the missing information. After getting all the details, ask the user to confirm the booking and if confirmed, then call the fucntion bookRoom and get the detail from there and provide all the response from there and break line by line put some emoji in the chats make bullets point for all the info get from the bookRoom."
                },
                ...messages
            ],

            functions: [
                {
                    name: "get_room_options",
                    description: "Get available room options",
                    parameters: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                },
                {
                    name: "book_room",
                    description: "Book a room",
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

            console.log('Received second response from OpenAI API:', JSON.stringify(secondResponse));

            if (!secondResponse.choices || secondResponse.choices.length === 0) {
                throw new Error('No response from OpenAI API in second call');
            }

            return secondResponse.choices[0].message.content;
        }

        if (!responseMessage.content) {
            return "I'm terribly sorry, but I'm not quite sure how to help with that. However, I can assist you with booking a room. How can I help you today?";
        }

        return responseMessage.content;
    } catch (error) {
        console.error('Error in OpenAI service:', error);
        if (error.response) {
            console.error('OpenAI API error response:', error.response.data);
        } else if (error.message.includes('No response from OpenAI API')) {
            // Custom handling for service interruption
            return "The OpenAI service is currently unavailable. Please try again later.";
        }
        throw error;
    }
};

module.exports = { processMessage };
