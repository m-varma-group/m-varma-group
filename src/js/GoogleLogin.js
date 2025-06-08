// GoogleLogin.js

// Import the custom hook from the @react-oauth/google library to handle OAuth login
import { useGoogleLogin } from '@react-oauth/google';

// Custom hook to encapsulate Google Drive login logic
export const useGoogleDriveLogin = ({
  onSuccessCallback, // Callback to run when login is successful
  stayLoggedIn,      // Boolean flag to determine whether token should persist in localStorage
}) => {

  // Initialize the Google login hook with required configuration
  const login = useGoogleLogin({
    // Callback for successful login
    onSuccess: (tokenResponse) => {
      // If the user chose to stay logged in, store token in localStorage
      if (stayLoggedIn) {
        localStorage.setItem('accessToken', tokenResponse.access_token); // Save the access token
        localStorage.setItem('stayLoggedIn', 'true'); // Mark session to persist
      }
      // Trigger external success callback with token
      onSuccessCallback(tokenResponse);
    },

    // Handle login error
    onError: () => alert('Login Failed'),

    // Define required OAuth scopes for Google Drive and user profile
    scope: 'https://www.googleapis.com/auth/drive profile email',

    // Use the implicit flow for frontend OAuth (access token returned in URL fragment)
    flow: 'implicit',

    // Redirect URI used by Google after login completes
    redirectUri: 'https://m-verma-group.vercel.app/oauth2/callback',
  });

  // Return the login function to be used in components
  return { login };
};
