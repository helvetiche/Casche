"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Goal, GoalTransaction } from "@/lib/types/goals";
import {
  ChartLine,
  TrendUp,
  Wallet,
  Target,
  CaretDown,
  CaretUp,
} from "phosphor-react";

interface AnalyticsProps {
  goals: Goal[];
}

const Analytics = ({ goals }: AnalyticsProps) => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [transactions, setTransactions] = useState<GoalTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">(
    "30d"
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(
        `/api/analytics/transactions?userId=${user.uid}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const fetchedTransactions = data.transactions || [];
        console.log(
          "Fetched transactions:",
          fetchedTransactions.length,
          fetchedTransactions
        );
        // Ensure dates are Date objects
        const processedTransactions = fetchedTransactions.map((tx: any) => ({
          ...tx,
          createdAt:
            tx.createdAt instanceof Date
              ? tx.createdAt
              : tx.createdAt?.seconds
              ? new Date(tx.createdAt.seconds * 1000)
              : new Date(tx.createdAt),
        }));
        console.log(
          "Processed transactions:",
          processedTransactions.length,
          processedTransactions
        );
        setTransactions(processedTransactions);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Failed to fetch transactions:",
          response.status,
          errorData
        );
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Filter transactions by time range
  const getFilteredTransactions = () => {
    if (timeRange === "all") return transactions;

    const now = new Date();
    const daysAgo = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    }[timeRange];

    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    cutoffDate.setHours(0, 0, 0, 0); // Set to start of day

    return transactions.filter((tx) => {
      const txDate =
        tx.createdAt instanceof Date ? tx.createdAt : new Date(tx.createdAt);
      return txDate >= cutoffDate;
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Prepare data for charts
  const prepareTimeSeriesData = () => {
    const dataMap = new Map<
      string,
      { date: string; deposits: number; withdrawals: number }
    >();

    filteredTransactions.forEach((tx) => {
      const date = new Date(tx.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (!dataMap.has(date)) {
        dataMap.set(date, { date, deposits: 0, withdrawals: 0 });
      }

      const entry = dataMap.get(date)!;
      if (tx.type === "deposit") {
        entry.deposits += tx.amount;
      } else {
        entry.withdrawals += tx.amount;
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const prepareGoalDistributionData = () => {
    const goalMap = new Map<string, { name: string; value: number }>();

    filteredTransactions.forEach((tx) => {
      const goal = goals.find((g) => g.id === tx.goalId);
      if (goal) {
        const existing = goalMap.get(goal.id) || {
          name:
            goal.title.length > 15
              ? goal.title.substring(0, 15) + "..."
              : goal.title,
          value: 0,
        };
        // Only count deposits for distribution
        if (tx.type === "deposit") {
          existing.value += tx.amount;
        }
        goalMap.set(goal.id, existing);
      }
    });

    return Array.from(goalMap.values()).filter((item) => item.value > 0);
  };

  const prepareMonthlyData = () => {
    const monthlyMap = new Map<
      string,
      { month: string; deposits: number; withdrawals: number; net: number }
    >();

    filteredTransactions.forEach((tx) => {
      const txDate =
        tx.createdAt instanceof Date ? tx.createdAt : new Date(tx.createdAt);
      const month = txDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { month, deposits: 0, withdrawals: 0, net: 0 });
      }

      const entry = monthlyMap.get(month)!;
      if (tx.type === "deposit") {
        entry.deposits += tx.amount;
      } else {
        entry.withdrawals += tx.amount;
      }
      entry.net = entry.deposits - entry.withdrawals;
    });

    return Array.from(monthlyMap.values()).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Calculate statistics
  const totalDeposits = filteredTransactions
    .filter((tx) => tx.type === "deposit")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalWithdrawals = filteredTransactions
    .filter((tx) => tx.type === "withdrawal")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netSavings = totalDeposits - totalWithdrawals;
  const transactionCount = filteredTransactions.length;

  const timeSeriesData = prepareTimeSeriesData();
  const goalDistributionData = prepareGoalDistributionData();
  const monthlyData = prepareMonthlyData();

  // Chart colors
  const COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];

  if (loading) {
    return (
      <div className="bg-amber-100 border border-emerald-900 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-amber-100 border border-emerald-900 rounded-lg p-6 text-center">
        <ChartLine
          size={32}
          className="mx-auto text-gray-400 mb-2"
          weight="thin"
        />
        <p className="text-xs text-gray-600">
          No transaction data available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 sm:space-x-3 mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <ChartLine
              size={20}
              className="text-amber-100 sm:w-5 sm:h-5"
              weight="fill"
            />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Analytics
          </h2>
        </div>

        {/* Time Range Selector - Only show when expanded */}
        {isExpanded && (
          <div className="flex items-center gap-2 pl-10 sm:pl-12">
            {(["7d", "30d", "90d", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs sm:text-xs rounded-full transition-colors ${
                  timeRange === range
                    ? "bg-emerald-900 text-amber-100"
                    : "bg-white border border-emerald-900 text-gray-700 hover:bg-amber-100"
                }`}
              >
                {range === "all" ? "All" : range.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendUp size={16} className="text-emerald-900" weight="bold" />
            <p className="text-xs text-gray-600">Total Deposits</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900">
            {formatCurrency(totalDeposits)}
          </p>
        </div>

        <div className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={16} className="text-emerald-900" weight="bold" />
            <p className="text-xs text-gray-600">Total Withdraws</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900">
            {formatCurrency(totalWithdrawals)}
          </p>
        </div>

        <div className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-emerald-900" weight="bold" />
            <p className="text-xs text-gray-600">Net Savings</p>
          </div>
          <p
            className={`text-lg sm:text-xl font-bold ${
              netSavings >= 0 ? "text-emerald-900" : "text-red-600"
            }`}
          >
            {formatCurrency(netSavings)}
          </p>
        </div>

        <div className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <ChartLine size={16} className="text-emerald-900" weight="bold" />
            <p className="text-xs text-gray-600">Transactions</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900">
            {transactionCount}
          </p>
        </div>
      </div>

      {/* Expand Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-900 text-amber-100 rounded-full hover:bg-emerald-800 transition-colors text-xs sm:text-sm font-medium"
          aria-label={isExpanded ? "Collapse charts" : "Expand charts"}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <span>{isExpanded ? "Hide Charts" : "Show Charts"}</span>
          {isExpanded ? (
            <CaretUp size={16} weight="bold" />
          ) : (
            <CaretDown size={16} weight="bold" />
          )}
        </button>
      </div>

      {/* Charts - Only show when expanded */}
      {isExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Time Series Chart */}
          <div className="bg-amber-100 border border-emerald-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-xs sm:text-base font-semibold text-gray-900 mb-4">
              Transaction Timeline
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis
                  dataKey="date"
                  stroke="#374151"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#374151"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `₱${value}`}
                />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    value !== undefined ? formatCurrency(value) : ""
                  }
                  contentStyle={{
                    backgroundColor: "#fef3c7",
                    border: "1px solid #059669",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  itemStyle={{
                    fontSize: "12px",
                  }}
                  labelStyle={{
                    fontSize: "11px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="deposits"
                  stroke="#059669"
                  strokeWidth={2}
                  name="Deposits"
                  dot={{ fill: "#059669", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="withdrawals"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Withdrawals"
                  dot={{ fill: "#ef4444", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Goal Distribution Pie Chart */}
          {goalDistributionData.length > 0 && (
            <div className="bg-amber-100 border border-emerald-900 rounded-lg p-4 sm:p-6">
              <h3 className="text-xs sm:text-base font-semibold text-gray-900 mb-4">
                Distribution by Goal
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={goalDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={{
                      stroke: "#111827",
                      strokeWidth: 1,
                    }}
                    label={({
                      name,
                      percent,
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                    }) => {
                      if (
                        midAngle === undefined ||
                        innerRadius === undefined ||
                        outerRadius === undefined
                      ) {
                        return null;
                      }
                      const RADIAN = Math.PI / 180;
                      const radius =
                        innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#111827"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                          style={{
                            fontSize: "11px",
                            fontWeight: "500",
                            fontFamily: "inherit",
                          }}
                        >
                          {`${name} ${
                            percent !== undefined
                              ? (percent * 100).toFixed(0)
                              : 0
                          }%`}
                        </text>
                      );
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {goalDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                    formatter={(value) => {
                      const entry = goalDistributionData.find(
                        (d) => d.name === value
                      );
                      return entry
                        ? `${value} (${formatCurrency(entry.value)})`
                        : value;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      value !== undefined ? formatCurrency(value) : ""
                    }
                    contentStyle={{
                      backgroundColor: "#fef3c7",
                      border: "1px solid #059669",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    itemStyle={{
                      fontSize: "12px",
                    }}
                    labelStyle={{
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly Net Savings Bar Chart */}
          {monthlyData.length > 0 && (
            <div className="bg-amber-100 border border-emerald-900 rounded-lg p-4 sm:p-6">
              <h3 className="text-xs sm:text-base font-semibold text-gray-900 mb-4">
                Monthly Net Savings
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis
                    dataKey="month"
                    stroke="#374151"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke="#374151"
                    style={{ fontSize: "12px" }}
                    tickFormatter={(value) => `₱${value}`}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      value !== undefined ? formatCurrency(value) : ""
                    }
                    contentStyle={{
                      backgroundColor: "#fef3c7",
                      border: "1px solid #059669",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    itemStyle={{
                      fontSize: "12px",
                    }}
                    labelStyle={{
                      fontSize: "11px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="net"
                    fill="#059669"
                    name="Net Savings"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly Comparison Chart */}
          {monthlyData.length > 0 && (
            <div className="bg-amber-100 border border-emerald-900 rounded-lg p-4 sm:p-6">
              <h3 className="text-xs sm:text-base font-semibold text-gray-900 mb-4">
                Monthly Comparison
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis
                    dataKey="month"
                    stroke="#374151"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke="#374151"
                    style={{ fontSize: "12px" }}
                    tickFormatter={(value) => `₱${value}`}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      value !== undefined ? formatCurrency(value) : ""
                    }
                    contentStyle={{
                      backgroundColor: "#fef3c7",
                      border: "1px solid #059669",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    itemStyle={{
                      fontSize: "12px",
                    }}
                    labelStyle={{
                      fontSize: "11px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="deposits"
                    fill="#059669"
                    name="Deposits"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="withdrawals"
                    fill="#ef4444"
                    name="Withdrawals"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
