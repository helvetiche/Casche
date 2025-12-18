"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { SavingsGoal } from "@/lib/types/savings";
import {
  X,
  Plus,
  CurrencyDollar,
  Shield,
  Airplane,
  Car,
  House,
  GraduationCap,
  User,
  TrendUp,
  Heart,
  Gift,
  Folder,
  Tag,
  Lock,
  Globe,
  Check,
} from "phosphor-react";

interface CreateSavingsGoalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (goal: SavingsGoal) => void;
}

const CreateSavingsGoal = ({
  isOpen,
  onClose,
  onCreate,
}: CreateSavingsGoalProps) => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.uid) {
      fetchFriends();
    }
  }, [isOpen, user?.uid]);

  const fetchFriends = async () => {
    try {
      setFriendsLoading(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(`/api/friends?userId=${user!.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setFriendsLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetAmount: "",
    targetDate: "",
    selectedCategories: [] as string[],
    customCategory: "",
    isPublic: false,
    friendsToInvite: [] as string[],
  });

  const categories = [
    { name: "Emergency Fund", Icon: Shield },
    { name: "Vacation", Icon: Airplane },
    { name: "Car", Icon: Car },
    { name: "House", Icon: House },
    { name: "Education", Icon: GraduationCap },
    { name: "Self", Icon: User },
    { name: "Savings", Icon: TrendUp },
    { name: "Wedding", Icon: Heart },
    { name: "Gift", Icon: Gift },
    { name: "Other", Icon: Folder },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Submitting goal:", {
      userId: user?.uid,
      title: formData.title,
      targetAmount: formData.targetAmount,
      hasUser: !!user,
      userUid: user?.uid,
    });

    if (!user?.uid || !formData.title || !formData.targetAmount) {
      console.error("Validation failed:", {
        userUid: user?.uid,
        title: formData.title,
        targetAmount: formData.targetAmount,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        throw new Error("Authentication required");
      }

      const goalData = {
        userId: user.uid,
        title: formData.title,
        description: formData.description,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate
          ? new Date(formData.targetDate).toISOString()
          : null,
        category:
          formData.selectedCategories.length > 0
            ? formData.selectedCategories[0]
            : "",
        isPublic: formData.isPublic,
      };

      const response = await fetch("/api/savings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create savings goal");
      }

      const data = await response.json();
      const goalId = data.goal.id;
      onCreate(data.goal);

      // Invite selected friends
      if (formData.friendsToInvite.length > 0) {
        console.log(
          "Inviting friends:",
          formData.friendsToInvite,
          "to goal:",
          goalId
        );
        try {
          await Promise.all(
            formData.friendsToInvite.map(async (friendId) => {
              console.log(
                "Sending invite to:",
                friendId,
                "from:",
                user.uid,
                "goal:",
                goalId
              );
              const inviteResponse = await fetch("/api/savings/requests", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                  action: "send",
                  fromUserId: user.uid,
                  toUserId: friendId,
                  savingsGoalId: goalId,
                }),
              });

              if (!inviteResponse.ok) {
                const errorData = await inviteResponse.json();
                console.error(
                  `Failed to invite friend ${friendId}:`,
                  errorData
                );
              } else {
                console.log(`Successfully invited friend ${friendId}`);
              }
            })
          );
        } catch (inviteError) {
          console.error("Error inviting friends:", inviteError);
          // Don't fail the whole operation if friend invites fail
        }
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        targetAmount: "",
        targetDate: "",
        selectedCategories: [],
        customCategory: "",
        isPublic: false,
        friendsToInvite: [],
      });
      onClose();
    } catch (error) {
      console.error("Error creating savings goal:", error);
      alert(
        error instanceof Error ? error.message : "Failed to create savings goal"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCategoryToggle = (categoryName: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryName)
        ? prev.selectedCategories.filter((cat) => cat !== categoryName)
        : [...prev.selectedCategories, categoryName],
    }));
  };

  const handleAddCustomCategory = () => {
    if (
      formData.customCategory.trim() &&
      !formData.selectedCategories.includes(formData.customCategory.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        selectedCategories: [
          ...prev.selectedCategories,
          formData.customCategory.trim(),
        ],
        customCategory: "",
      }));
    }
  };

  const handleRemoveCategory = (categoryName: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.filter(
        (cat) => cat !== categoryName
      ),
    }));
  };

  const handleFriendToggle = (friendId: string) => {
    setFormData((prev) => ({
      ...prev,
      friendsToInvite: prev.friendsToInvite.includes(friendId)
        ? prev.friendsToInvite.filter((id) => id !== friendId)
        : [...prev.friendsToInvite, friendId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-amber-50 rounded-lg max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Create Savings Goal
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            aria-label="Close modal"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 sm:space-y-6"
        >
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Goal Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Honda Click"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Optional description of your savings goal"
            />
          </div>

          {/* Target Amount */}
          <div>
            <label
              htmlFor="targetAmount"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Target Amount *
            </label>
            <div className="relative">
              <CurrencyDollar
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="number"
                id="targetAmount"
                value={formData.targetAmount}
                onChange={(e) =>
                  handleInputChange("targetAmount", e.target.value)
                }
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label
              htmlFor="targetDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Target Date
            </label>
            <input
              type="date"
              id="targetDate"
              value={formData.targetDate}
              onChange={(e) => handleInputChange("targetDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category (select multiple)
            </label>

            {/* Predefined Categories */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {categories.map((category) => {
                const isSelected = formData.selectedCategories.includes(
                  category.name
                );
                const IconComponent = category.Icon;
                return (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => handleCategoryToggle(category.name)}
                    className={`flex items-center justify-center space-x-1 px-3 py-2 rounded-full text-xs font-medium transition-all touch-manipulation w-full min-h-[32px] ${
                      isSelected
                        ? "bg-emerald-900 text-amber-100 border border-emerald-300"
                        : "bg-amber-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <IconComponent size={12} weight="bold" />
                    <span className="truncate text-center leading-tight">
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Category Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={formData.customCategory}
                onChange={(e) =>
                  handleInputChange("customCategory", e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomCategory();
                  }
                }}
                placeholder="Add custom category"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={handleAddCustomCategory}
                disabled={!formData.customCategory.trim()}
                className="px-4 py-2 bg-emerald-900 text-amber-100 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium touch-manipulation"
              >
                Add
              </button>
            </div>

            {/* Selected Categories Display */}
            {formData.selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {formData.selectedCategories.map((category) => {
                  const categoryData = categories.find(
                    (cat) => cat.name === category
                  );
                  const IconComponent = categoryData?.Icon || Tag;
                  return (
                    <div
                      key={category}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-emerald-900 text-amber-100 rounded-full text-xs"
                    >
                      <IconComponent size={12} weight="bold" />
                      <span>{category}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(category)}
                        className="ml-1 hover:bg-emerald-200 rounded-full p-0.5"
                      >
                        <X size={10} weight="bold" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Public/Private Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleInputChange("isPublic", false)}
                className={`flex items-center justify-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  !formData.isPublic
                    ? "bg-emerald-900 text-amber-100 border border-emerald-900"
                    : "bg-amber-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <Lock size={12} weight="bold" />
                <span>Private</span>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange("isPublic", true)}
                className={`flex items-center justify-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  formData.isPublic
                    ? "bg-emerald-900 text-amber-100 border border-emerald-900"
                    : "bg-amber-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <Globe size={12} weight="bold" />
                <span>Public</span>
              </button>
            </div>
          </div>

          {/* Invite Friends */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite Friends (optional)
            </label>
            {friendsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="text-xs text-amber-500 mt-2">
                  Loading friends...
                </p>
              </div>
            ) : friends.length === 0 ? (
              <p className="text-sm text-amber-500 text-center py-4">
                No friends to invite. Add friends first!
              </p>
            ) : (
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                <div className="divide-y divide-gray-100">
                  {friends.map((friend) => {
                    const isSelected = formData.friendsToInvite.includes(
                      friend.friendId
                    );
                    return (
                      <div
                        key={friend.id}
                        className={`flex items-center justify-between p-3 hover:bg-amber-50 cursor-pointer ${
                          isSelected ? "border-emerald-900" : ""
                        }`}
                        onClick={() => handleFriendToggle(friend.friendId)}
                      >
                        <div className="flex items-center space-x-4">
                          {friend.friendProfile.photoURL ? (
                            <img
                              src={friend.friendProfile.photoURL}
                              alt={`${
                                friend.friendProfile.displayName || "User"
                              }'s avatar`}
                              className="w-12 h-12 rounded-full border-3 border-emerald-900 shadow-md object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-amber-50 border-3 border-emerald-900 rounded-full flex items-center justify-center shadow-md">
                              <User
                                size={18}
                                className="text-emerald-900"
                                weight="bold"
                              />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {friend.friendProfile.displayName ||
                                "Anonymous User"}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? "bg-emerald-900 border-emerald-900"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              weight="bold"
                              className="text-white"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {formData.friendsToInvite.length > 0 && (
              <p className="text-xs text-emerald-600 mt-2">
                {formData.friendsToInvite.length} friend
                {formData.friendsToInvite.length > 1 ? "s" : ""} will be invited
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 sm:py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors font-medium touch-manipulation"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 sm:py-2 bg-emerald-900 text-amber-100 rounded-md hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 touch-manipulation"
              disabled={
                isSubmitting || !formData.title || !formData.targetAmount
              }
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus size={16} weight="bold" />
                  <span>Create Goal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSavingsGoal;
