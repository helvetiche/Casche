"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { GoalRequestWithDetails } from "@/lib/types/goals";
import {
  Check,
  X,
  UserCircle,
  Target,
  MagnifyingGlass,
  Funnel,
} from "phosphor-react";
import * as PhosphorIcons from "phosphor-react";
import AlertModal from "./AlertModal";

interface GoalRequestsProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  sortBy?: "date" | "target-date" | "progress" | "amount";
  setSortBy?: (sort: "date" | "target-date" | "progress" | "amount") => void;
  showFilters?: boolean;
  setShowFilters?: (show: boolean) => void;
}

const GoalRequests = ({
  searchQuery = "",
  setSearchQuery,
  sortBy = "date",
  setSortBy,
  showFilters = false,
  setShowFilters,
}: GoalRequestsProps) => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [requests, setRequests] = useState<GoalRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [alertModal, setAlertModal] = useState<{
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
    if (user?.uid) {
      fetchRequests();
    }
  }, [user?.uid]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(`/api/goals/requests?userId=${user!.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching goal requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (
    requestId: string,
    action: "accept" | "decline"
  ) => {
    setProcessing((prev) => new Set(prev).add(requestId));

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        alert("Authentication required");
        return;
      }

      const response = await fetch("/api/goals/requests", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ requestId, action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process request");
      }

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));

      if (action === "accept") {
        setAlertModal({
          isOpen: true,
          title: "Request Accepted",
          message: "Goal sharing request accepted!",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Error processing request:", error);
      setAlertModal({
        isOpen: true,
        title: "Request Failed",
        message:
          error instanceof Error ? error.message : "Failed to process request",
        type: "error",
      });
    } finally {
      setProcessing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getIconComponent = (goal: any) => {
    if (goal.iconType === "phosphor" && goal.iconName) {
      return (PhosphorIcons as any)[goal.iconName] || Target;
    }
    return Target;
  };

  // Filter and sort requests
  const filterAndSortRequests = () => {
    let filtered = requests;
    const query = (
      setSearchQuery ? searchQuery : localSearchQuery
    ).toLowerCase();

    // Search filter
    if (query.trim()) {
      filtered = filtered.filter(
        (request) =>
          request.goal.title.toLowerCase().includes(query) ||
          request.goal.description?.toLowerCase().includes(query) ||
          request.fromUserProfile.displayName?.toLowerCase().includes(query) ||
          request.fromUserProfile.email?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "target-date":
          if (!a.goal.targetDate && !b.goal.targetDate) return 0;
          if (!a.goal.targetDate) return 1;
          if (!b.goal.targetDate) return -1;
          return (
            new Date(a.goal.targetDate).getTime() -
            new Date(b.goal.targetDate).getTime()
          );
        case "progress":
          const progressA = (a.goal.currentAmount / a.goal.targetAmount) * 100;
          const progressB = (b.goal.currentAmount / b.goal.targetAmount) * 100;
          return progressB - progressA;
        case "amount":
          return b.goal.targetAmount - a.goal.targetAmount;
        case "date":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return filtered;
  };

  const filteredRequests = filterAndSortRequests();
  const currentSearchQuery = setSearchQuery ? searchQuery : localSearchQuery;
  const handleSearchChange = setSearchQuery || setLocalSearchQuery;
  const handleShowFilters = setShowFilters || (() => {});

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-amber-50 border border-emerald-900 rounded-lg p-4 sm:p-6"
          >
            <div className="animate-pulse space-y-4">
              {/* From User */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              </div>

              {/* Goal Info */}
              <div className="bg-white border border-gray-300 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-gray-300 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-full"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-10 bg-gray-300 rounded-full"></div>
                <div className="flex-1 h-10 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search and Filter Bar */}
        <div className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4">
          {/* Search and Filter Row */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <MagnifyingGlass
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                weight="regular"
              />
              <input
                type="text"
                placeholder="Search by goal title, description, or user name..."
                value={currentSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
              />
            </div>

            {/* Sort Button */}
            <button
              onClick={() => handleShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              <Funnel size={18} weight="regular" />
              <span>Sort</span>
            </button>

            {/* Clear Filters Button */}
            {(currentSearchQuery || sortBy !== "date") && (
              <button
                onClick={() => {
                  handleSearchChange("");
                  if (setSortBy) setSortBy("date");
                }}
                className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600 hover:text-gray-800 whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Options */}
          {showFilters && (
            <div className="mt-3 bg-amber-100 border border-emerald-900 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "date", label: "Date Received" },
                  { value: "target-date", label: "Target Date" },
                  { value: "progress", label: "Progress" },
                  { value: "amount", label: "Target Amount" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy && setSortBy(option.value as any)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-colors ${
                      sortBy === option.value
                        ? "bg-emerald-900 border border-emerald-900 text-amber-100"
                        : "bg-gray-100 border border-emerald-900 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-amber-50 border border-emerald-900 rounded-lg p-4 sm:p-6"
              >
                <div className="animate-pulse space-y-4">
                  {/* From User */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                    </div>
                  </div>

                  {/* Goal Info */}
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-gray-300 rounded-lg flex-shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-full"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-10 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 h-10 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <Target
              size={48}
              className="mx-auto text-gray-400 mb-4"
              weight="thin"
            />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No pending requests
            </h3>
            <p className="text-sm text-gray-600">
              When friends share their goals with you, requests will appear
              here.
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlass
              size={48}
              className="mx-auto text-gray-400 mb-4"
              weight="thin"
            />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No requests found
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Try adjusting your search criteria.
            </p>
            <button
              onClick={() => {
                handleSearchChange("");
                if (setSortBy) setSortBy("date");
              }}
              className="text-sm text-emerald-900 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const IconComponent = getIconComponent(request.goal);
              const isProcessing = processing.has(request.id);

              return (
                <div
                  key={request.id}
                  className="bg-amber-50 border border-emerald-900 rounded-lg p-4 sm:p-6"
                >
                  {/* From User */}
                  <div className="flex items-center space-x-3 mb-4">
                    {request.fromUserProfile.photoURL ? (
                      <img
                        src={request.fromUserProfile.photoURL}
                        alt={request.fromUserProfile.displayName || "User"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <UserCircle
                          size={20}
                          className="text-emerald-900"
                          weight="fill"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {request.fromUserProfile.displayName ||
                          "Anonymous User"}
                      </div>
                      <div className="text-xs text-gray-500">
                        wants to share a goal with you
                      </div>
                    </div>
                  </div>

                  {/* Goal Info */}
                  <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      {request.goal.iconType === "custom" &&
                      request.goal.iconUrl ? (
                        <img
                          src={request.goal.iconUrl}
                          alt={request.goal.title}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent
                            size={24}
                            className="text-amber-100"
                            weight="fill"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 truncate">
                          {request.goal.title}
                        </h4>
                        {request.goal.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {request.goal.description}
                          </p>
                        )}
                        <div className="mt-2 text-sm text-gray-700">
                          <span className="font-medium">
                            {formatCurrency(request.goal.currentAmount)}
                          </span>
                          {" / "}
                          <span>
                            {formatCurrency(request.goal.targetAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRequest(request.id, "accept")}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-900 text-amber-100 rounded-full hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check size={18} weight="bold" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleRequest(request.id, "decline")}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X size={18} weight="bold" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
};

export default GoalRequests;
