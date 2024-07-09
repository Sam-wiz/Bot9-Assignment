const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const sequelize = require('./config/database');
const Conversation = require('./models/Conversation');
const User = require('./models/User');
const openaiService = require('./services/openaiService');
const roomService = require('./services/roomService');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

const auth = (req, res, next) => {
  const token = req.header('Authorization').split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

app.post('/api/chat', auth, async (req, res) => {
  try {
    console.log('Received chat request:', req.body);
    const { message, userId } = req.body;

    if (!message || !userId) {
      console.log('Invalid request: missing message or userId');
      return res.status(400).json({ error: 'Message and userId are required.' });
    }

    let [conversation, created] = await Conversation.findOrCreate({
      where: { userId },
      defaults: { messages: [] }
    });

    console.log('Conversation retrieved/created:', conversation.toJSON());

    conversation.messages = [...conversation.messages, { role: 'user', content: message }];

    let openaiResponse;
    try {
      console.log('Processing message with OpenAI...');
      openaiResponse = await openaiService.processMessage(conversation.messages);
      console.log('OpenAI response received:', openaiResponse);
    } catch (error) {
      console.error('Error processing message with OpenAI:', error);
      return res.status(500).json({ error: 'An error occurred while processing your message.' });
    }

    conversation.messages = [...conversation.messages, { role: 'assistant', content: openaiResponse }];

    await conversation.save();
    console.log('Conversation saved:', conversation.toJSON());

    res.json({ response: openaiResponse });
  } catch (error) {
    console.error('Error in chat handler:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

app.post('/api/auth/register', [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    let user = await User.findOne({ where: { email } });

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials. Please use a different email or log in with correct password.' });
      }

      const payload = { user: { id: user.id } };

      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
        if (err) throw err;
        res.json({ token, username: user.username });
      });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({ username, email, password: hashedPassword });

      const payload = { user: { id: user.id } };

      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
        if (err) throw err;
        res.json({ token, username: user.username });
      });
    }
  } catch (err) {
    console.error('Error during registration:', err);
    if (err.errors) {
      err.errors.forEach((errorItem) => {
        console.error(errorItem.message);
      });
    }
    res.status(500).send('Server error');
  }
});


app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Email is required'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = { user: { id: user.id } };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
      if (err) throw err;
      res.json({ token, username: user.username });
    });
  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).send('Server error');
  }
});


const PORT = 5000;

sequelize.sync({ force: true }).then(async () => {
  console.log('Database synced');
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to sync database:', err);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

