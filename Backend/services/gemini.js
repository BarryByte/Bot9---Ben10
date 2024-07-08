// Required modules
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const { DataTypes } = require('sequelize');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Database setup
const sequelize = require('./database/db');

// Model definition
const ConversationMessage = sequelize.define('ConversationMessage', {
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isUserMessage: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true 
  },
});

// Chat service using Google Generative AI
const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
  responseMimeType: "text/plain"
};

async function Chat(message, sessionId = false) {
  let historyy = [];

  const hotelRooms = await fetch(
    `https://bot9assignement.deno.dev/rooms`
  ).then((res) => res.json());

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
  });

  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [
          {
            text: `You are Bot 9, an AI assistant designed to help users with hotel booking. Your primary role is to assist users by providing accurate information here are the details of the hotel rooms ${hotelRooms}`
          }
        ]
      },
      {
        role: "model",
        parts: [
          {
            text: "Understood! You can now ask me anything related to hotel bookings. I'll do my best to be your helpful and informative AI assistant, Bot 9. How can I help you today?"
          }
        ]
      },
      ...historyy
    ]
  });

  const response = await chatSession.sendMessage(message);

  console.log("response is this", response.response.text());

  return response.response.text();
}

// Session validation middleware
const validateSession = async (req, res, next) => {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(401).json({
      message: 'Unauthorized'
    });
  }

  try {
    const session = await ConversationMessage.findOne({
      where: {
        sessionId
      }
    });

    if (!session) {
      return res.status(401).json({
        message: 'Unauthorized'
      });
    }
  } catch (err) {
    console.log("Error while validating session: ", err);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }

  req.sessionId = sessionId;
  next();
}

// Chat Router Controller
class chatRouterController {
  static async createSession(req, res) {
    try {
      const sessionId = uuidv4();

      // Creating a session
      await ConversationMessage.create({
        sessionId,
        message: 'Hello! How can I help you?',
        isUserMessage: false
      });

      // Setting cookie
      await res.cookie("sessionId", sessionId, {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
      });

      res.status(200).json({
        message: 'Session created Successfully',
        sessionId: sessionId
      });
    } catch (err) {
      res.status(500).json({
        message: 'Internal server error'
      });
      console.log("Error while creating session: ", err);
    }
  }

  static async deleteSession(req, res) {
    try {
      const sessionId = req.sessionId;
      await ConversationMessage.destroy({
        where: {
          sessionId
        }
      });

      res.clearCookie('sessionId');

      res.status(200).json({
        message: 'Session deleted'
      });
    } catch (err) {
      res.status(500).json({
        message: 'Internal server error'
      });
      console.log("Error while deleting session: ", err);
    }
  }

  static async sendMessage(req, res) {
    try {
      const { message, sessionId } = req.body;
      console.log("Session ID: ", sessionId);
      console.log("Message: ", message);

      const response = await Chat(message, sessionId);

      await ConversationMessage.create({
        sessionId,
        message,
        isUserMessage: true,
      });

      await ConversationMessage.create({
        sessionId,
        message: response,
        isUserMessage: false,
      });

      res.status(200).json({
        message: "Message sent successfully",
        data: response,
      });
    } catch (err) {
      res.status(500).json({
        message: 'Internal server error'
      });
      console.log("Error while sending message: ", err);
    }
  }
}

// Router setup
const chatRouter = express.Router();
chatRouter.post('/session', chatRouterController.createSession);
chatRouter.delete("/session", validateSession, chatRouterController.deleteSession);
chatRouter.post("/", validateSession, chatRouterController.sendMessage);

// Server setup
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/chat", chatRouter);
app.use(express.static(path.join(__dirname, "./frontend/dist")));

(async () => {
  await sequelize.sync();
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
  });
  console.log("Database synced");
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
})();
