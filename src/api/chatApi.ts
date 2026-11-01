import httpClient from './httpClient';

export interface ChatMessage {
  _id?: string;
  senderId: string;
  senderType: 'user' | 'admin' | 'driver';
  message?: string;
  image?: string;
  timestamp?: string;
}

export interface StartSupportChatPayload {
  userId?: string;
}

export interface SupportChatResponse {
  id: string;
  _id?: string;
  messages?: ChatMessage[];
  chat?: ChatMessage[];
}

export const chatApi = {
  startChat: async (payload: {driverId: string; userId: string}) => {
    return httpClient.post<{data: any}>(
      '/chat/start',
      payload,
    );
  },

  getMessages: async (chatId: string) => {
    return httpClient.get<{data: any}>(
      `/chat/${chatId}/history`,
    );
  },

  startSupportChat: async (payload: StartSupportChatPayload) => {
    return httpClient.post<{data: SupportChatResponse}>(
      '/support-chat/start',
      payload,
    );
  },

  getSupportChatHistory: async (chatId: string) => {
    return httpClient.get<{data: SupportChatResponse}>(
      `/support-chat/${chatId}/history`,
    );
  },

  sendMessage: async (chatId: string, message: string, image?: string) => {
    return httpClient.post<{data: ChatMessage}>(
      `/support-chat/${chatId}/message`,
      {message, image},
    );
  },
};

export const subadminSettingsApi = {
  // Add subadmin settings endpoints as needed
};
