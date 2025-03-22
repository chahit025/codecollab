import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_URL; // adjust to your backend URL
axios.defaults.withCredentials = true;

export default axios;