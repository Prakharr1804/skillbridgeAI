import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    withCredentials: true
})

export async function register({ username, email, password, otp }) {
    const response = await api.post('/api/auth/register', {
        username,
        email,
        password,
        otp
    });
    return response.data;
}

export async function login({email, password}) {
    try{
        const response = await api.post('/api/auth/login', {
            email, password
        })

        return response.data
    }catch(err) {
        console.log(err);
        throw err;
    }
}

export async function logout(){
    try{
        const response = await api.get('/api/auth/logout')

        return response.data
    }catch(err) {
        console.log(err);
    }
}

export async function getMe(){
    try{
        const response = await api.get('/api/auth/get-me')

        return response.data
    }catch(err){
        console.log(err);
    }
}

export async function sendOtp({ email, isRegistration }) {
  const response = await api.post("/api/auth/send-otp", { email, isRegistration });
  return response.data;
}

export async function verifyOtp({ email, otp }) {
  const response = await api.post("/api/auth/verify-otp", { email, otp });
  return response.data;
}