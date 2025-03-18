"use client";

import { useState, useEffect } from "react";
import { parseEther } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Droplets, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { tokenABI } from "@/lib/token-abi";
import { TOKEN_ADDRESS } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";

// Create a custom event for balance updates
export const balanceUpdateEvent = new Event('balanceUpdate');

export function FaucetForm() {
  const [amount, setAmount] = useState("10");
  const [error, setError] = useState("");
  const { address } = useAccount();

  const { 
    writeContract, 
    isPending: isMinting,
    error: writeError,
    data: hash
  } = useWriteContract();

  const { 
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: waitError
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle success with useEffect instead of onSuccess callback
  useEffect(() => {
    if (isConfirmed) {
      setAmount("10");
      // Dispatch event to notify other components to update
      window.dispatchEvent(balanceUpdateEvent);
    }
  }, [isConfirmed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      writeContract({
        address: TOKEN_ADDRESS,
        abi: tokenABI,
        functionName: 'mint',
        args: [address, parseEther(amount)]
      });
    } catch (err) {
      setError(`Failed to request tokens: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSliderChange = (value: number[]) => {
    setAmount(value[0].toString());
  };

  const displayError = error || writeError?.message || waitError?.message;
  const isLoading = isMinting || isConfirming;

  const openTransaction = () => {
    if (hash) {
      window.open(`https://amoy.polygonscan.com/tx/${hash}`, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="w-full"
    >
      <Card className="backdrop-blur-sm bg-secondary/30 border-border overflow-hidden">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <Droplets className="h-5 w-5 text-primary mr-2" />
                <h3 className="text-lg font-medium text-foreground">Request Tokens</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="amount" className="text-sm text-muted-foreground">
                      Amount to request
                    </label>
                    <span className="text-sm font-medium text-foreground">{amount} tokens</span>
                  </div>
                  
                  <Slider
                    defaultValue={[10]}
                    max={100}
                    min={1}
                    step={1}
                    value={[parseFloat(amount)]}
                    onValueChange={handleSliderChange}
                    className="my-4"
                  />
                  
                  <div className="flex space-x-2">
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-secondary/50 border-border text-foreground"
                      placeholder="Enter amount"
                      min="1"
                      max="100"
                    />
                    <Button 
                      type="submit" 
                      disabled={!address || isLoading}
                      className="min-w-[120px] bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Droplets className="h-4 w-4 mr-2" />
                      )}
                      {isLoading ? "Processing" : "Request"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Maximum 100 tokens per day</p>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {hash && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert className="bg-primary/10 border-primary/30 text-foreground">
                    <div className="flex items-center">
                      {isConfirmed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                      )}
                      <AlertDescription className="flex-1">
                        {isConfirmed ? 'Transaction confirmed!' : 'Transaction submitted!'} 
                      </AlertDescription>
                      <button 
                        onClick={openTransaction}
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </Alert>
                </motion.div>
              )}

              {displayError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert className="bg-destructive/10 border-destructive/30 text-foreground">
                    <AlertCircle className="h-4 w-4 text-destructive mr-2" />
                    <AlertDescription>
                      {displayError}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

