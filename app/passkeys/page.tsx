"use client";

import React, { useState, useEffect } from 'react';
import Button from "@/components/Button";
import { WebAuthn } from './_classes/WebAuthn';
import { mockServer } from './_utils/mock-server';
import { toHex } from 'viem';

const PasskeysPage = () => {
  const [registrationStatus, setRegistrationStatus] = useState('');
  const [authenticationStatus, setAuthenticationStatus] = useState('');
  const [isPasskeyAvailable, setIsPasskeyAvailable] = useState(false);
  const [username, setUsername] = useState('test@example.com');

  useEffect(() => {
    const checkPasskeyAvailability = async () => {
      const available = await WebAuthn.platformAuthenticatorIsAvailable();
      setIsPasskeyAvailable(available);
    };

    checkPasskeyAvailability();
  }, []);

  const registerPasskey = async () => {
    try {
      const credential = await WebAuthn.create({ username });

      console.log({ credential });

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const result = await mockServer.completeRegistration(username, credential);

      if (result.success) {
        setRegistrationStatus('Passkey registered successfully!');
      } else {
        throw new Error('Server verification failed');
      }
    } catch (err) {
      console.error(err);
      setRegistrationStatus('Failed to register passkey.');
    }
  };

  const authenticateWithPasskey = async () => {
    try {
      const challenge = await mockServer.startAuthentication(username);

      const assertion = await WebAuthn.get(toHex(challenge));

      console.log({ assertion });

      if (!assertion) {
        throw new Error('Failed to get assertion');
      }

      const result = await mockServer.completeAuthentication(username, assertion);

      if (result.success) {
        setAuthenticationStatus('Authentication successful!');
      } else {
        throw new Error('Server verification failed');
      }
    } catch (err) {
      console.error(err);
      setAuthenticationStatus('Authentication failed.');
    }
  };

  return (
    <div className="h-screen w-full flex justify-center items-center bg-gray-100">
      <div className="flex flex-col gap-6 w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-center text-gray-800">Passkey Authentication Demo</h1>

        {!isPasskeyAvailable && (
          <p className="text-sm text-center text-red-600">
            Passkeys are not available on this device or browser.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={registerPasskey} className="w-full" disabled={!isPasskeyAvailable}>
            Register Passkey
          </Button>
          {registrationStatus && (
            <p className="text-sm text-center text-gray-600">{registrationStatus}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={authenticateWithPasskey} className="w-full" disabled={!isPasskeyAvailable}>
            Authenticate with Passkey
          </Button>
          {authenticationStatus && (
            <p className="text-sm text-center text-gray-600">{authenticationStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasskeysPage;
