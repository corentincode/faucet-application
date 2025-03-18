"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { tokenABI } from "@/lib/token-abi";
import { TOKEN_ADDRESS } from "@/lib/constants";
import { motion } from "framer-motion";
import { RefreshCw, Coins, Clock } from 'lucide-react';

export function TokenInfo() {
  const { address } = useAccount();
  const [dailyLimit, setDailyLimit] = useState<string | null>(null);
  const [userDailyUsage, setUserDailyUsage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get token info using useReadContracts
  const { data: tokenData, refetch: refetchTokenData } = useReadContracts({
    contracts: [
      {
        address: TOKEN_ADDRESS,
        abi: tokenABI,
        functionName: 'name',
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenABI,
        functionName: 'symbol',
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenABI,
        functionName: 'balanceOf',
        args: [address || '0x0000000000000000000000000000000000000000'],
      },
    ],
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Get daily limit
  const { data: dailyLimitData } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenABI,
    functionName: 'dailyLimit',
  });

  // Get user's daily usage
  const { data: userDailyUsageData, refetch: refetchUsage } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenABI,
    functionName: 'userDailyUsage',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  });

  useEffect(() => {
    if (dailyLimitData) {
      setDailyLimit(formatEther(dailyLimitData as bigint));
    }
    if (userDailyUsageData) {
      setUserDailyUsage(formatEther(userDailyUsageData as bigint));
    }
  }, [dailyLimitData, userDailyUsageData]);

  // Function to manually refresh data
  const refreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchTokenData(), refetchUsage()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Extract token data
  const tokenName = tokenData?.[0]?.result as string;
  const tokenSymbol = tokenData?.[1]?.result as string;
  const balance = tokenData?.[2]?.result as bigint;
  const formattedBalance = balance ? formatEther(balance) : "0";

  // Calculate daily usage percentage
  const usagePercentage = userDailyUsage && dailyLimit 
    ? Math.min(100, (parseFloat(userDailyUsage) / parseFloat(dailyLimit)) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="backdrop-blur-sm bg-secondary/30 border-border overflow-hidden">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-foreground flex items-center">
                  {tokenName || <Skeleton className="h-6 w-24 bg-secondary" />} 
                  <span className="text-muted-foreground ml-2">
                    ({tokenSymbol || <Skeleton className="h-4 w-8 inline-block bg-secondary" />})
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">ERC-20 Test Token</p>
              </div>
              <button 
                onClick={refreshData}
                disabled={isRefreshing}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                <div className="flex items-center mb-2">
                  <Coins className="h-4 w-4 text-primary mr-2" />
                  <p className="text-sm text-muted-foreground">Your Balance</p>
                </div>
                {balance === undefined ? (
                  <Skeleton className="h-8 w-32 bg-secondary mt-1" />
                ) : (
                  <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                    {parseFloat(formattedBalance).toFixed(2)} <span className="text-lg">{tokenSymbol}</span>
                  </p>
                )}
              </div>
              
              <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                <div className="flex items-center mb-2">
                  <Clock className="h-4 w-4 text-primary mr-2" />
                  <p className="text-sm text-muted-foreground">Daily Usage</p>
                </div>
                {userDailyUsage === null ? (
                  <Skeleton className="h-8 w-32 bg-secondary mt-1" />
                ) : (
                  <>
                    <p className="text-lg font-medium text-foreground">
                      {parseFloat(userDailyUsage).toFixed(2)} / {parseFloat(dailyLimit || "100").toFixed(2)} {tokenSymbol}
                    </p>
                    <div className="w-full bg-secondary/70 rounded-full h-2 mt-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${usagePercentage}%` }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-r from-primary/80 to-primary h-2 rounded-full"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

