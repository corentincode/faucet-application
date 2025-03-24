"use client"

import { useEffect, useState } from "react"
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi"
import { Button } from "@/components/ui/button"
import { injected } from "wagmi/connectors"
import { motion } from "framer-motion"
import { Wallet, LogOut, ExternalLink, AlertCircle, ArrowRight } from "lucide-react"

// Définir l'ID de chaîne Polygon Amoy
const POLYGON_AMOY_CHAIN_ID = 80002

interface ConnectButtonProps {
  onConnectionChange: (connected: boolean) => void
}

export function ConnectButton({ onConnectionChange }: ConnectButtonProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [ethereumChainId, setEthereumChainId] = useState<number | null>(null)

  // Récupérer l'ID de chaîne directement depuis window.ethereum
  useEffect(() => {
    async function getEthereumChainId() {
      if (window.ethereum && typeof window.ethereum.request === "function") {
        try {
          const chainIdHex = await window.ethereum.request({ method: "eth_chainId" })
          const chainIdDecimal = Number.parseInt(chainIdHex, 16)
          setEthereumChainId(chainIdDecimal)
        } catch (error) {
          console.error("Erreur lors de la récupération de l'ID de chaîne:", error)
        }
      }
    }

    if (isConnected) {
      getEthereumChainId()
    }

    // Ajouter un écouteur pour les changements de chaîne
    if (window.ethereum) {
      const handleChainChanged = (chainId: string) => {
        const chainIdDecimal = Number.parseInt(chainId, 16)
        setEthereumChainId(chainIdDecimal)
      }

      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [isConnected])

  // Utiliser ethereumChainId s'il est disponible, sinon utiliser chainId de wagmi
  const effectiveChainId = ethereumChainId !== null ? ethereumChainId : chainId
  const isCorrectNetwork = effectiveChainId === POLYGON_AMOY_CHAIN_ID

  useEffect(() => {
    onConnectionChange(isConnected)
  }, [isConnected, onConnectionChange])

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  const openExplorer = () => {
    window.open(`https://amoy.polygonscan.com/address/${address}`, "_blank")
  }

  const handleSwitchNetwork = async () => {
    try {
      setSwitchError(null)
      await switchChain({ chainId: POLYGON_AMOY_CHAIN_ID })
    } catch (error) {
      console.error("Erreur lors du changement de réseau:", error)
      setSwitchError("Échec du changement de réseau")

      // Essayer d'ajouter le réseau si le changement échoue
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}`,
                chainName: "Polygon Amoy Testnet",
                nativeCurrency: {
                  name: "MATIC",
                  symbol: "MATIC",
                  decimals: 18,
                },
                rpcUrls: ["https://rpc-amoy.polygon.technology"],
                blockExplorerUrls: ["https://amoy.polygonscan.com"],
              },
            ],
          })
        } catch (addError) {
          console.error("Erreur lors de l'ajout du réseau:", addError)
        }
      }
    }
  }

  if (isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center space-y-3 w-full"
      >
        <div
          className={`backdrop-blur-sm rounded-full py-2 px-4 flex items-center justify-center border cursor-pointer ${isCorrectNetwork ? "bg-secondary/50 border-border" : "bg-destructive/10 border-destructive/30"}`}
          onClick={!isCorrectNetwork ? handleSwitchNetwork : undefined}
          title={!isCorrectNetwork ? "Cliquez pour changer vers Polygon Amoy" : ""}
        >
          <div
            className={`w-2 h-2 rounded-full mr-2 animate-pulse ${isCorrectNetwork ? "bg-green-500" : "bg-destructive"}`}
          />
          <p className="text-sm text-foreground/80">
            {isCorrectNetwork ? (
              "Connecté à Polygon Amoy"
            ) : (
              <span className="flex items-center">
                <AlertCircle className="h-3 w-3 mr-1 text-destructive" />
                <span className="text-destructive">Mauvais réseau</span>
                <ArrowRight className="ml-1 h-3 w-3 text-destructive" />
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-secondary/50 backdrop-blur-sm border-border hover:bg-secondary/70"
            onClick={openExplorer}
          >
            <span className="font-mono">{formatAddress(address || "")}</span>
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

        {switchError && <p className="text-xs text-destructive">{switchError}</p>}
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <Button
        onClick={() => connect({ connector: injected() })}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6"
      >
        <Wallet className="mr-2 h-5 w-5" />
        Connect Wallet
      </Button>
    </motion.div>
  )
}

