"use client"

import { useState, useEffect } from "react"
import { ConnectButton } from "@/components/connect-button"
import { TokenInfo } from "@/components/token-info"
import { AdminPanel } from "@/components/admin-panel"
import { TabsContainer } from "@/components/tabs-container"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { NetworkCheck } from "@/components/network-check"
import { useAccount } from "wagmi"
import { useIsContractOwner } from "@/lib/contract-utils"

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { address } = useAccount()
  const { isOwner } = useIsContractOwner(address as `0x${string}` | undefined)

  // Listen for balance update events
  useEffect(() => {
    const handleBalanceUpdate = () => {
      // Force refresh the TokenInfo component
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1)
      }, 0)
    }

    window.addEventListener("balanceUpdate", handleBalanceUpdate)

    return () => {
      window.removeEventListener("balanceUpdate", handleBalanceUpdate)
    }
  }, [])

  return (
    <div className="container mx-auto py-8">
      <NetworkCheck>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full backdrop-blur-sm bg-card/90 rounded-2xl shadow-2xl overflow-hidden border border-border relative"
          style={{
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Card glow effect */}
          <div
            className="absolute -inset-[100px] opacity-30"
            style={{
              background: "radial-gradient(circle, rgba(142, 81, 255, 0.2) 0%, rgba(0, 0, 0, 0) 70%)",
              transform: "rotate(0deg)",
              zIndex: 0,
            }}
          />

          {/* Card shine effect */}
          <div
            className="absolute inset-0 overflow-hidden"
            onMouseEnter={(e) => {
              const el = e.currentTarget.querySelector(".shine-effect")
              if (el) {
                el.classList.add("animate-shine")
                setTimeout(() => el.classList.remove("animate-shine"), 1000)
              }
            }}
          >
            <div
              className="shine-effect absolute top-0 -left-[100%] w-[50%] h-full"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)",
                transition: "0.5s",
              }}
            />
          </div>

          <div className="p-8 space-y-8 relative z-10">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <Sparkles className="h-8 w-8 text-primary mr-2" />
              </div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                Token Faucet
              </h1>
              <p className="text-muted-foreground mt-2">Demandez des tokens de test pour le développement</p>
            </div>

            <ConnectButton onConnectionChange={setIsConnected} />

            {isConnected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <TokenInfo key={refreshKey} />
                <TabsContainer />

                {/* Afficher les panneaux d'administration uniquement pour le propriétaire */}
                {isOwner && (
                  <>
                    <AdminPanel />
                  </>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Token Faucet. Tous droits réservés.</p>
        </footer>
      </NetworkCheck>
    </div>
  )
}

