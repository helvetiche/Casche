"use client";

import { Wallet } from "phosphor-react";

interface WalletCardProps {
  cardNumber: string;
  totalSavings: number;
  userName?: string;
}

const WalletCard = ({
  cardNumber,
  totalSavings,
  userName,
}: WalletCardProps) => {
  // Format card number with spaces every 4 characters
  const formatCardNumber = (number: string) => {
    return number.match(/.{1,4}/g)?.join(" ") || number;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* E-Wallet Card */}
      <div className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-700 rounded-full -mr-16 -mt-16 opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-700 rounded-full -ml-12 -mb-12 opacity-20"></div>

        {/* Card Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Wallet size={24} className="text-amber-100" weight="fill" />
              <span className="text-amber-100 font-semibold text-lg tracking-wide">
                CASCHE
              </span>
            </div>
            <div className="text-amber-100 text-xs font-medium">My Savings</div>
          </div>

          {/* Card Number */}
          <div className="mb-8">
            <p className="text-amber-100/70 text-xs mb-2 font-medium tracking-wider">
              USER ID
            </p>
            <p className="text-amber-100 text-xs sm:text-3xl font-mono font-bold tracking-wider">
              {formatCardNumber(cardNumber)}
            </p>
          </div>

          {/* Total Savings */}
          <div className="">
            <p className="text-amber-100/70 text-xs mb-2 font-medium tracking-wider">
              TOTAL SAVINGS
            </p>
            <p className="text-amber-100 text-3xl sm:text-lg font-bold">
              {formatCurrency(totalSavings)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletCard;
