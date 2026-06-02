import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './style.scss'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isConfigured = googleClientId && googleClientId !== 'your_google_client_id_here';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isConfigured ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)