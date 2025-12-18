export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  createdAt: Date;
  status: 'accepted';
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
}

export interface FriendWithProfile extends Friend {
  friendProfile: UserProfile;
}

export interface FriendRequestWithProfile extends FriendRequest {
  fromUserProfile: UserProfile;
  toUserProfile: UserProfile;
}