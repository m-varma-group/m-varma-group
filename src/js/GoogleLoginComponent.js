import React from 'react';
import { GoogleLogin } from '@react-oauth/google';

const GoogleLoginComponent = ({ onLoginSuccess }) => {
  return (
    <div>
      <GoogleLogin
        onSuccess={credentialResponse => {
          console.log('Login Success:', credentialResponse);
          onLoginSuccess(credentialResponse);
        }}
        onError={() => {
          console.log('Login Failed');
        }}
      />
    </div>
  );
};

export default GoogleLoginComponent;
