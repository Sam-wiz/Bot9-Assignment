import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { email, password } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/chat'); // Redirect to chat after successful login
    } catch (err) {
      console.error(err.response.data.message);
    }
  };

  return (
    <div className='log_cont'>
      <h2 className='login'>Login to chat and book a room</h2>
      <form onSubmit={e => onSubmit(e)} className='frm'>
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
          className='sec'
          required
        />
        <button type="submit">Login</button>
      </form>
      <p>
        Not registered? <Link className='lin' to="/register">Register here</Link>
      </p>
    </div>
  );
};

export default Login;
