import dotenv from 'dotenv';
dotenv.config();

export interface TwitchCredentials {
  clientId: string;
  clientSecret: string;
}

export function getTwitchCredentials(): TwitchCredentials {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();

  if (!clientId) {
    throw new Error(
      '❌ TWITCH_CLIENT_ID is not set. Please add it to your .env file.'
    );
  }

  if (!clientSecret) {
    throw new Error(
      '❌ TWITCH_CLIENT_SECRET is not set. Please add it to your .env file.'
    );
  }

  return { clientId, clientSecret };
}