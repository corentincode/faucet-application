"use client";

import { useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { injected } from "wagmi/connectors";
import { motion } from "framer-motion";
import { Wallet, LogOut, ExternalLink } from 'lucide-react';

interface ConnectButtonProps {
  onConnectionChange: (connected: boolean) => void;
}

export function ConnectButton({ onConnectionChange }: ConnectButtonProps) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    onConnectionChange(isConnected);
  }, [isConnected, onConnectionChange]);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const openExplorer = () => {
    window.open(`https://amoy.polygonscan.com/address/${address}`, '_blank');
  };

  if (isConnected) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center space-y-3 w-full"
      >
        <div className="bg-secondary/50 backdrop-blur-sm rounded-full py-2 px-4 flex items-center justify-center border border-border">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
          <p className="text-sm text-foreground/80">Connected</p>
        </div>
        
        <div className="flex items-center justify-center space-x-2 w-full">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 bg-secondary/50 backdrop-blur-sm border-border hover:bg-secondary/70"
            onClick={openExplorer}
          >
            <span className="font-mono">{formatAddress(address || '')}</span>
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="bg-secondary/50 backdrop-blur-sm border-border hover:bg-secondary/70"
            onClick={() => disconnect()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Button 
        onClick={() => connect({ connector: injected() })} 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6"
      >
        <Wallet className="mr-2 h-5 w-5" />
        Connect Wallet
      </Button>
    </motion.div>
  );
}

