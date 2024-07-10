
# Simplified Hotel Booking Chatbot

## Objective

Developed a RESTful API using Express.js that implements a chatbot capable of handling hotel booking queries. The chatbot uses Gemini-1.5-Flash for natural language processing and maintains conversation history.

Here's the link of the hosted project (AWS + Render): [Simplified Hotel Booking Chatbot](https://main.d2kvnf7sqmud7t.amplifyapp.com/)

## Technical Requirements

- Used **Express.js** as the framework for building the API.
- Integrated **Gemini-1.5-Flash** for natural language processing.
- Implemented conversation history storage using **sqlite** and **sequelize**.
- Implemented **function calling** to get rooms data & simulate booking a room.

## Main Endpoint

- **POST /chat** - Handles user messages and returns chatbot responses.

## Chatbot Flow

1. User initiates a conversation about booking a resort room.
2. Bot fetches room options from an API and responds with a list of room options.
3. User selects a room.
4. Bot provides pricing information.
5. User confirms they want to proceed with booking.
6. Bot makes a simulated API call to book the room and returns a booking confirmation with a booking ID.

## Skills Demonstrated

- Creating a RESTful API with Express.js.
- Integrating and using Gemini-1.5-Flash for natural language processing.
- Maintaining conversation history throughout the chat session.
- Implementing function calling to simulate external API interactions (room booking).

## Bonus Features

- Implemented basic error handling for invalid user inputs or API failures.
- Added a simple frontend interface for interacting with the chatbot (using HTML, CSS, and JavaScript or React).

## Setup Instructions

### Prerequisites

- Node.js (>=18.x)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Gemini-1.5-Flash API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   ```

### Running the Project

1. Start the server:
   ```bash
   npm start
   ```

2. The API will be accessible at `http://localhost:3000`.

### Example API Requests and Responses

#### POST /chat

**Request:**
```json
{
  "message": "I want to book a resort room."
}
```

**Response:**
```json
{
  "response": "Sure! Here are some room options...",
  "rooms": [
    {
      "id": 1,
      "type": "Deluxe Room",
      "price": "$200/night"
    },
    {
      "id": 2,
      "type": "Suite",
      "price": "$350/night"
    }
  ]
}
```

## API Key Setup

To set up the Gemini-1.5-Flash API key:

1. Sign up on the Gemini platform and obtain your API key.
2. Add the key to your `.env` file as shown above.

