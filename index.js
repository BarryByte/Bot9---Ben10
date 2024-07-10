const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const { OpenAI } = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
const axios = require('axios');
app.use(cors());
const app = express();
const port = process.env.PORT || 3001; // Use environment variable for port

app.use(express.json()); // Use built-in middleware

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DATABASE_STORAGE || 'database.sqlite' // Use environment variable for storage
});

const Conversation = sequelize.define('Conversation', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    response: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

sequelize.sync().catch(error => console.error('Error syncing database:', error));

const roomScraper = async () => {
    try {
        const response = await axios.get('https://bot9assignement.deno.dev/rooms');
        return response.data; // Assuming the response.data is an array of room objects
    } catch (error) {
        console.error('Error fetching rooms:', error);
        throw new Error('Failed to fetch rooms');
    }
};

const bookRoom = async (roomId, fullName, email, nights) => {
    try {
        const response = await axios.post('https://bot9assignement.deno.dev/book', {
            roomId,
            fullName,
            email,
            nights
        });
        return response.data;
    } catch (error) {
        console.error('Error booking room:', error);
        throw new Error('Failed to book room');
    }
};


const chatWithOpenAI = async (message) => {
    try {
        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0613",
            messages: [{"role": "user", "content": message}],
          });
        
        const wantsToUseFunction = chatCompletion.choices[0].finish_reason === "function_call";

        if (wantsToUseFunction) {
            const functionCall = chatCompletion.choices[0].message.function_call;
            let content;

            if (functionCall.name === "scraper") {
                const argumentObj = JSON.parse(functionCall.arguments);
                content = await roomScraper(argumentObj.keyword);
            } else {
                // Handle other function calls if needed
                throw new Error(`Function ${functionCall.name} not supported`);
            }

            // Prepare messages array with function response
            const messages = [
                chatCompletion.choices[0].message,
                { role: "function", name: functionCall.name, content }
            ];

            // Call OpenAI again with the function response included
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo-0613",
                messages,
            });

            return response.choices[0].message.content;
        } else {
            // Return regular response if no function call
            return chatCompletion.choices[0].message.content;
        }
    } catch (error) {
        console.error('Error with OpenAI API:', error);
        throw new Error('Failed to fetch response from OpenAI');
    }
};


app.post('/chat', async (req, res) => {
    const { userId, message } = req.body;

    try {
        let botMessage;

        const chatResponse = await chatWithOpenAI(message);

        botMessage = chatResponse;

        const resp = await Conversation.create({ userId, message, response: botMessage });
        console.log(resp);
        res.json({ message: botMessage });
    } catch (error) {
        console.error('Error handling chat message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
