import React from 'react';
import './App.css';
import Chatbot from './Chatbot';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Hotel Booking Chatbot</h1>
      </header>
      <main>
        <div className="Chatbot-container">
          <Chatbot />
        </div>
      </main>
    </div>
  );
}

export default App;
