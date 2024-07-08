const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const { Sequelize, DataTypes } = require("sequelize");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors()); // Use the cors middleware
app.use(express.json());
app.use(bodyParser.json());

const sequelize = new Sequelize({
	dialect: "sqlite",
	storage: "database.sqlite"
});

const functions = {
	get_Rooms: async () => {
		try {
			const url = "https://bot9assignement.deno.dev/rooms";
			const response = await axios.get(url);
			const data = await response.data;

			console.log("Fetched rooms:", data.rooms);
			return data;
		} catch (error) {
			console.error("Error fetching rooms:", error);
			return { error: "Failed to fetch rooms" };
		}
	},

	book_Room: async ({email, name, roomId, nights}) => {
		try {
			const url = "https://bot9assignement.deno.dev/book";
      console.log(name);
      console.log(email);
      console.log(roomId);
      console.log(nights);

			const response = await axios.post(url, {
				fullName: name,
				email: email,
				nights: nights,
        roomId: roomId
			});
      console.log("Booking response:", response.data);
      return response.data; 
		} catch (error) {
			console.error("Error fetching rooms:", error);
			return { error: "Failed to fetch rooms" };
		}
	}
};

const getRoomsFunctionDeclaration = {
	name: "get_Rooms",
  description : "Fetch available Room data"
};
const bookingFunctionDeclaration = {
	name: "book_Room",
	parameters: {
		type: "object",
		description: "Book a room after user provides details",
		properties: {
			name: {
				type: "string",
				description: "Name of the person booking the room."
			},
			email: {
				type: "string",
				description: "Email address of the person booking the room."
			},
      nights: {
        type: "number",
        description: "Number of nights the person is booking the room for."
      },
      roomId:{
        type: "number",
        description: "Id of the room being booked."
      }
		},
		required: ["name", "email", "nights", "roomId"]
	}
};

const generativeModel = genAI.getGenerativeModel({
	model: "gemini-1.5-flash",
	systemInstruction:
		"You are a hotel booking assistant. First greet the user. Ask the user to select a room. Ask the duration of stay in nights. Display the total price. Confirm the booking with the user. Format the responses in a readable way, don't use visual formatting like asterisks for bold.",
	tools: {
		functionDeclarations: [
			getRoomsFunctionDeclaration,
			bookingFunctionDeclaration
		]
	}
});

const chat = generativeModel.startChat();

const handleChat = async (prompt) => {
	try {
		const result = await chat.sendMessage(prompt);

		console.log("Initial result:", result.response.text());

		const functionCalls = result.response.functionCalls();

		if (functionCalls && functionCalls.length > 0) {
       
      for(let i = 0; i<functionCalls.length ; i++){
        const call = functionCalls[i]  ;
      
			console.log("Function call:", call);

			if (call) {
				console.log("Function call detected:", call);

				const apiResponse = await functions[call.name](call.args);

				console.log("API Response:", apiResponse);

				let sendMessagePayload;

				if (Array.isArray(apiResponse)) {
					sendMessagePayload = {
						functionResponse: {
							name: "get_Rooms",
							response: {
								rooms: apiResponse.map((room) => ({
									id: room.id,
									name: room.name,
									description: room.description,
									price: room.price
								}))
							}
						}
					};
				} else {
					sendMessagePayload = {
						functionResponse: {
							name: "get_Rooms",
							response: apiResponse
						}
					};
				}

				const result2 = await chat.sendMessage([sendMessagePayload]);

				console.log("Response text:", result2.response.text());
				return result2.response.text();
			} else {
				console.log("No function call detected in the response.");
				return result.response.text();
			}}
		} else {
			console.log("No function call detected in the response.");
			return result.response.text();
		}
    
	} catch (error) {
		console.error("Error in main function:", error);
		return "Sorry, something went wrong.";
	}
};

app.post("/chat", async (req, res) => {
	const { message } = req.body;

	if (!message) {
		return res.status(400).json({ error: "Message is required" });
	}

	try {
		const response = await handleChat(message);
		res.status(200).json({ message: response });
	} catch (error) {
		console.error("Error handling chat:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

app.listen(port, () => {
	console.log(`Server started at port ${port}`);
});
