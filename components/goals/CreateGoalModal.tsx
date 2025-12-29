"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Goal } from "@/lib/types/goals";
import { UserProfile } from "@/lib/types/friends";
import ModalPortal from "./ModalPortal";
import AlertModal from "./AlertModal";
import {
  X,
  Target,
  Bank,
  Gift,
  Car,
  House,
  Airplane,
  GameController,
  Book,
  Heart,
  Camera,
  MusicNote,
  Upload,
  UserCircle,
} from "phosphor-react";
import * as PhosphorIcons from "phosphor-react";

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (goal: Goal) => void;
}

const POPULAR_ICONS = [
  { name: "Target", icon: Target },
  { name: "Bank", icon: Bank },
  { name: "Gift", icon: Gift },
  { name: "Car", icon: Car },
  { name: "House", icon: House },
  { name: "Airplane", icon: Airplane },
  { name: "GameController", icon: GameController },
  { name: "Book", icon: Book },
  { name: "Heart", icon: Heart },
  { name: "Camera", icon: Camera },
  { name: "MusicNote", icon: MusicNote },
];

const CreateGoalModal = ({
  isOpen,
  onClose,
  onCreate,
}: CreateGoalModalProps) => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [iconType, setIconType] = useState<"phosphor" | "custom">("phosphor");
  const [selectedIconName, setSelectedIconName] = useState("Target");
  const [customIconUrl, setCustomIconUrl] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(
    new Set()
  );
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  useEffect(() => {
    if (isOpen && user?.uid) {
      fetchFriends();
    }
  }, [isOpen, user?.uid]);

  const fetchFriends = async () => {
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(`/api/friends?userId=${user!.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(
          data.friends.map((f: any) => f.friendProfile as UserProfile)
        );
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !targetAmount) {
      setAlert({
        isOpen: true,
        title: "Missing Information",
        message: "Please fill in all required fields",
        type: "error",
      });
      return;
    }

    if (iconType === "phosphor" && !selectedIconName) {
      setAlert({
        isOpen: true,
        title: "Icon Required",
        message: "Please select an icon for your goal",
        type: "error",
      });
      return;
    }

    if (iconType === "custom" && !customIconUrl) {
      setAlert({
        isOpen: true,
        title: "Icon URL Required",
        message: "Please provide an icon URL",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        setAlert({
          isOpen: true,
          title: "Authentication Required",
          message: "Please sign in to continue",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const response = await fetch("/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          targetAmount: Number(targetAmount),
          targetDate: targetDate || undefined,
          iconType,
          iconName: iconType === "phosphor" ? selectedIconName : undefined,
          iconUrl: iconType === "custom" ? customIconUrl : undefined,
          friendIds: Array.from(selectedFriends),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create goal");
      }

      const data = await response.json();
      onCreate(data.goal);

      // Reset form
      setTitle("");
      setDescription("");
      setTargetAmount("");
      setTargetDate("");
      setSelectedIconName("Target");
      setCustomIconUrl("");
      setSelectedFriends(new Set());
      setIconType("phosphor");
      onClose();
    } catch (error) {
      console.error("Error creating goal:", error);
      setAlert({
        isOpen: true,
        title: "Failed to Create Goal",
        message:
          error instanceof Error ? error.message : "Failed to create goal",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, we'll use a URL. In production, you'd upload to storage first
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomIconUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  if (!isOpen) return null;

  return (
    <>
      <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-amber-50 border border-emerald-900 rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-emerald-900">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">
                Create New Goal
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClose();
                  }
                }}
              >
                <X size={24} weight="bold" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4"
            >
              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  placeholder="e.g., New Laptop"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Add a description for your goal..."
                />
              </div>

              {/* Target Amount */}
              <div>
                <label
                  htmlFor="targetAmount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Target Amount <span className="text-red-500">*</span>
                </label>
                <input
                  id="targetAmount"
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              {/* Target Date */}
              <div>
                <label
                  htmlFor="targetDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Target Date (Optional)
                </label>
                <input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setIconType("phosphor")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                      iconType === "phosphor"
                        ? "bg-emerald-900 text-amber-100"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    Choose Icon
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconType("custom")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                      iconType === "custom"
                        ? "bg-emerald-900 text-amber-100"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    Upload Custom
                  </button>
                </div>

                {iconType === "phosphor" ? (
                  <div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {POPULAR_ICONS.map(({ name, icon: Icon }) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setSelectedIconName(name)}
                          className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full transition-colors border-2 ${
                            selectedIconName === name
                              ? "bg-emerald-900 text-amber-100 border-emerald-900"
                              : "bg-white text-gray-700 border-gray-300 hover:border-emerald-500 hover:bg-emerald-50"
                          }`}
                        >
                          <Icon
                            size={16}
                            weight="fill"
                            className="sm:w-5 sm:h-5"
                          />
                          <span className="text-xs sm:text-sm font-medium">
                            {name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={customIconUrl}
                      onChange={(e) => setCustomIconUrl(e.target.value)}
                      placeholder="Enter image URL"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                    />
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIconUpload}
                        className="hidden"
                      />
                      <span className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300 transition-colors">
                        <Upload size={16} weight="regular" />
                        <span>Upload Image</span>
                      </span>
                    </label>
                    {customIconUrl && (
                      <img
                        src={customIconUrl}
                        alt="Preview"
                        className="mt-2 w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Friend Selection */}
              {friends.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Share with Friends (Optional)
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {friends.map((friend) => (
                      <label
                        key={friend.uid}
                        className="flex items-center space-x-2 sm:space-x-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriends.has(friend.uid)}
                          onChange={() => toggleFriend(friend.uid)}
                          className="rounded flex-shrink-0"
                        />
                        {friend.photoURL ? (
                          <img
                            src={friend.photoURL}
                            alt={friend.displayName || "Friend"}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-gray-300 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-100 rounded-full flex items-center justify-center border border-gray-300 flex-shrink-0">
                            <UserCircle
                              size={14}
                              className="text-emerald-900 sm:w-4 sm:h-4"
                              weight="fill"
                            />
                          </div>
                        )}
                        <span className="text-xs sm:text-sm truncate min-w-0 flex-1">
                          {friend.displayName || friend.email}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-900 text-amber-100 rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </>
  );
};

export default CreateGoalModal;
