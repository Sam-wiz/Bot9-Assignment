import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Chat.css';

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([{ text: 'Welcome to Hotel Booking Assistant. How may I help you?', sender: 'ai' }]);
  const [userId, setUserId] = useState(1);

  useEffect(() => {
    const userIdFromStorage = localStorage.getItem('userId');
    if (userIdFromStorage) {
      setUserId(userIdFromStorage);
    }
  }, []);

  const sendMessage = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      };
      const requestData = { message, userId };
      const res = await axios.post('http://localhost:5000/api/chat', requestData, config);
      setMessages([...messages, { text: message, sender: 'user' }, { text: res.data.response, sender: 'ai' }]);
      setMessage('');
    } catch (err) {
      console.error(err.response.data.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <h2>Hotel Booking AI</h2>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            {msg.sender === 'ai' ? <img src="https://via.placeholder.com/30/0000FF/FFFFFF?text=AI" alt="AI Profile" className="profile-image" /> : null}
            <p>{msg.text}</p>
            {msg.sender === 'user' ? <img src="https://via.placeholder.com/30/FFD700/FFFFFF?text=U" alt="User Profile" className="profile-image" /> : null}
          </div>
        ))}
      </div>
      <div className="chat-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
      <button className="logout-button" onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Chat;
