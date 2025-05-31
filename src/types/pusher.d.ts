declare module 'pusher-js' {
  export interface PusherOptions {
    wsHost?: string;
    wsPort?: number;
    forceTLS?: boolean;
    enabledTransports?: string[];
    disabledTransports?: string[];
    cluster?: string;
    key: string;
  }

  export interface Channel {
    bind(event: string, callback: (data: any) => void): void;
    unbind(event: string, callback?: (data: any) => void): void;
    trigger(event: string, data: any): void;
  }

  export default class Pusher {
    constructor(key: string, options?: PusherOptions);
    subscribe(channel: string): Channel;
    unsubscribe(channel: string): void;
    disconnect(): void;
    trigger(channel: string, event: string, data: any): void;
  }
} 