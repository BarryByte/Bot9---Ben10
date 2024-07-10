const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const { Sequelize, DataTypes } = require("sequelize");
const {
	GoogleGenerativeAI,
	HarmBlockThreshold,
	HarmCategory
} = require("@google/generative-ai");
const axios = require("axios");
const nodemailer = require("nodemailer");

const safetySettings = [
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
	},
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
	}
];
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
	model: "gemini-1.5-flash",
	safetySettings
});

const app = express();
const port = process.env.PORT || 3001;

app.use(cors()); // Use the cors middleware
app.use(express.json());
app.use(bodyParser.json());

const sequelize = new Sequelize({
	dialect: "sqlite",
	storage: "database.sqlite"
});

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 587,
	auth: {
	  user: process.env.EMAIL_USER,
	  pass: process.env.EMAIL_PASS
	}
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

	book_Room: async ({ email, name, roomId, nights }) => {
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

			async function sendEmail(name, email, response) {
				const mailOptions = {
					from: process.env.EMAIL_USER,
					to: email,
					subject: "Booking Confirmation",
					html: `
					<h1>Booking Confirmation</h1>
					<p>Dear ${name},</p>
					<p><b>Thank you for booking with the Omniverse Paradise Hotel. Your booking details are given below:</b></p>
					<ul>
					  <li>Booking ID: ${response.bookingId}</li>
					  <li>Room Type: ${response.roomName}</li>
					  <li>Number of Nights: ${response.nights}</li>
					  <li>Total Price: $${response.totalPrice}</li>
					</ul>
					<p>We look forward to welcoming you to the Omniverse Paradise Hotel!</p>
				  `
				};

				try {
					await transporter.sendMail(mailOptions);
					console.log("Confirmation email sent successfully");
				} catch (error) {
					console.error("Error sending confirmation email:", error);
				}
			}

			await sendEmail(name, email, response.data);
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
	description: "Fetch available Room data"
};
const bookingFunctionDeclaration = {
	name: "book_Room",
	description: "Book a room after user provides details",
	parameters: {
		type: "object",
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
				description:
					"Number of nights the person is booking the room for."
			},
			roomId: {
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
		// "You are a hotel booking assistant. Do not response if you are asked about anything other than hotel rooms, prices, amenities, etc. First greet the user when user greet you or say Hello . Ask the user to select a room. Ask the duration of stay in nights. Display the total price. Confirm the booking with the user. Format the responses in a readable way, don't use visual formatting like asterisks for bold.",
		`General

Chatbot Name: Ben10
Hotel Name: Omniverse Paradise Hotel
Purpose

Assist customers in making reservations at the Omniverse Paradise Hotel only.
Interaction Style

Focus: Hotel reservations only. Politely decline to answer irrelevant questions.
Tone: Friendly, supportive, and patient.
Emoticons: Use simple emoticons like :).
Emojis: Avoid emojis.
Output Format: Clear, readable information with lines and bullet points.
Fetching Room Data

Ben10 does not have room data by default.
Use the fetchRoomDetails function to retrieve room type, description, and price from here.
Present room details neatly formatted with options for the user to choose.
Provide specific details about a room if directly asked.
Booking Process

Gather check-in and check-out dates.
Calculate total cost based on dates and store it.
Ask for booking confirmation.
Collect full name and email address.
Use the makeBooking function to confirm by sending full name, email, and number of nights (in JSON format) to this endpoint.
Store the received booking ID.
Confirm booking and provide the booking ID to the user.
Ben10 Functions

fetchRoomDetails: Retrieves room details (type, description, price).
makeBooking: Confirms booking by sending user information to the provided API endpoint.
Important Note

If a user asks a question outside of the hotel reservation scope (e.g., restaurant recommendations, local attractions), politely inform them that Ben10's expertise lies in hotel reservations. You can suggest searching online for those inquiries.`,
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
			for (let i = 0; i < functionCalls.length; i++) {
				const call = functionCalls[i];

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

					const result2 = await chat.sendMessage([
						sendMessagePayload
					]);

					console.log("Response text:", result2.response.text());
					return result2.response.text();
				} else {
					// console.log("No function call detected in the response.");
					return result.response.text();
				}
			}
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
