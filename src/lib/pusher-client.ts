import Pusher from 'pusher-js';

const getPusherConfig = () => {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const host = process.env.NEXT_PUBLIC_PUSHER_HOST;
  const port = process.env.NEXT_PUBLIC_PUSHER_PORT;

  if (!key || !host) {
    throw new Error('Missing required Pusher configuration');
  }

  return {
    key,
    wsHost: host,
    wsPort: port ? parseInt(port, 10) : 6001,
    forceTLS: process.env.NODE_ENV === 'production',
    enabledTransports: ['ws', 'wss'],
    cluster: 'mt1', // Default cluster for local development
    disableStats: true, // Disable stats for local development
  };
};

export const createPusherClient = () => {
  const config = getPusherConfig();
  return new Pusher(config.key, config);
}; 