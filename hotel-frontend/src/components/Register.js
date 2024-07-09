import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css'

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const { username, email, password } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', formData);
      localStorage.setItem('token', res.data.token);
      navigate('/chat'); 
    } catch (err) {
      console.error(err.response.data.errors);
    }
  };

  return (
    <div className='log_cont'>
      <h2 className='reg'>Register</h2>
      <form onSubmit={e => onSubmit(e)} className='frm'>
        <input
          type="text"
          placeholder="Username"
          name="username"
          value={username}
          onChange={e => onChange(e)}
          required
        />
        <input
          type="email"
          placeholder="Email Address"
          name="email"
          value={email}
          onChange={e => onChange(e)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          name="password"
          value={password}
          onChange={e => onChange(e)}
          minLength="6"
          required
        />
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;
