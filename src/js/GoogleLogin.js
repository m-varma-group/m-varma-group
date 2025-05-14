// GoogleLogin.js
import { useGoogleLogin } from '@react-oauth/google';

export const useGoogleDriveLogin = ({
  onSuccessCallback,
  stayLoggedIn,
}) => {
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      if (stayLoggedIn) {
        localStorage.setItem('accessToken', tokenResponse.access_token);
        localStorage.setItem('stayLoggedIn', 'true');
      }
      onSuccessCallback(tokenResponse);
    },
    onError: () => alert('Login Failed'),
    scope: 'https://www.googleapis.com/auth/drive profile email',
    flow: 'implicit',
    redirectUri: 'https://secure-dwg.vercel.app/oauth2/callback',
  });

  return { login };
};
