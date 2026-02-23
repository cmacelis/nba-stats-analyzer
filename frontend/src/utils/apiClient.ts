import axios from 'axios';

// Empty in dev — Vite proxy routes /api/* to localhost:3000.
// In production set VITE_API_BASE_URL to the Heroku backend origin (no trailing slash, no /api).
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
    // Remove the RapidAPI headers; your local backend doesn't need them
  }
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);