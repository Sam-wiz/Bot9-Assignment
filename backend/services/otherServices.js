const nodeMailer = require('nodemailer');
require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'https://bot9assignement.deno.dev';

const getRoomOptions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/rooms`);
    return response.data;
  } catch (error) {
    console.error('Error fetching room options:', error);
    throw error;
  }
};

async function sendMail(userEmail, subject, text, ) {

  const transporter = nodeMailer.createTransport({
      service: 'gmail',
      auth: {
          user: process.env.AUTH_EMAIL,
          pass: process.env.AUTH_PASSWORD
      }

  });
  const mailoption = {
      from: process.env.AUTH_EMAIL,
      to: userEmail,
      subject: subject,
      text:text,
  };
  try {
      await transporter.sendMail(mailoption);
      console.log('Email sent');
  } catch (error) {
      console.log('Error sending email:', error);
  }
};


async function bookRoom(roomId, fullName, email, nights) {
  console.log('Booking room:', roomId, fullName, email, nights);
  try {
    const response = await axios.post('https://bot9assignement.deno.dev/book', {
      roomId:roomId,
      fullName: fullName,
      email: email,
      nights: nights
    });
    console.log('Room booked:', response.data); 
    let msg = `Dear ${fullName},
    Thank you for choosing our hotel. This email confirms your reservation details -:
    Room: ${roomId}
    Name: ${fullName}
    Email: ${email}
    Duration: ${nights} nights
    Your reservation has been successfully confirmed. We look forward to welcoming you.
    If you have any questions or special requests, please don't hesitate to contact us. We hope you enjoy your stay.`;
    sendMail(email, "Booking Confirmation", msg);
    return response.data;
    
  } catch (error) { 
    console.error('Error booking room:', error);
    return null;
  }
}
module.exports = { getRoomOptions, bookRoom };
