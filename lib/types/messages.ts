export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
}

export interface Chat {
  id: string;
  participants: string[]; // Array of user IDs
  lastMessage: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
}

export interface ChatWithParticipants extends Chat {
  otherUser: {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
  };
}
