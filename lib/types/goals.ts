import { UserProfile } from "./friends";

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  iconType: "phosphor" | "custom";
  iconName?: string; // For Phosphor icons
  iconUrl?: string; // For custom uploaded icons
  createdAt: Date;
  updatedAt: Date;
  lastUpdatedBy?: string;
}

export interface GoalMember {
  id: string;
  goalId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: Date;
}

export interface GoalRequest {
  id: string;
  goalId: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalTransaction {
  id: string;
  goalId: string;
  userId: string;
  type: "deposit" | "withdrawal";
  amount: number;
  description?: string;
  createdAt: Date;
}

export interface QuickSubmitButton {
  id: string;
  goalId: string;
  label: string;
  amount: number;
  order: number;
}

export interface GoalWithMembers extends Goal {
  members: (GoalMember & { userProfile: UserProfile })[];
}

export interface GoalWithTransactions extends Goal {
  transactions: GoalTransaction[];
}

export interface GoalWithDetails extends Goal {
  members: (GoalMember & { userProfile: UserProfile })[];
  transactions: GoalTransaction[];
  quickSubmitButtons: QuickSubmitButton[];
}

export interface GoalRequestWithDetails extends GoalRequest {
  goal: Goal;
  fromUserProfile: UserProfile;
  toUserProfile: UserProfile;
}
