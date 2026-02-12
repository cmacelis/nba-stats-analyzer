import axios from 'axios';

// Point this to your local backend through the Vite proxy
const API_BASE_URL = ''; 

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