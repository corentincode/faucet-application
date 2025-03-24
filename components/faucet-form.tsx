"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Droplets, AlertCircle, Loader2, CheckCircle } from "lucide-react"
import { parseEther } from "viem"
import { motion } from "framer-motion"
import { tokenABI } from "@/lib/token-abi"
import { TOKEN_ADDRESS } from "@/lib/constants"
import { ResetUsageButton } from "./reset-usage-button"

// Définir l'ID de chaîne Polygon Amoy
const POLYGON_AMOY_CHAIN_ID = 80002

// Create a custom event for balance updates
export const balanceUpdateEvent = new Event("balanceUpdate")

export function FaucetForm() {
  const [amount, setAmount] = useState("1")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
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

  const { writeContract, isPending, data: hash } = useWriteContract()

  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  // Utiliser useEffect pour gérer le succès de la transaction
  useEffect(() => {
    if (isSuccess && !success) {
      setSuccess(`${amount} tokens ont été ajoutés à votre portefeuille!`)
      // Utiliser setTimeout pour éviter les mises à jour d'état pendant le rendu
      setTimeout(() => {
        window.dispatchEvent(balanceUpdateEvent)
      }, 0)
    }
  }, [isSuccess, success, amount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!address) {
      setError("Veuillez connecter votre portefeuille")
      return
    }

    if (!isCorrectNetwork) {
      setError("Veuillez vous connecter au réseau Polygon Amoy")
      return
    }

    try {
      const parsedAmount = parseEther(amount)

      await writeContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: tokenABI,
        functionName: "mint",
        args: [address, parsedAmount],
      })
    } catch (err) {
      console.error("Erreur lors du mint:", err)
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

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
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Droplets className="h-5 w-5 text-primary mr-2" />
                  <h3 className="text-lg font-medium text-foreground">Demander des Tokens</h3>
                </div>
                <ResetUsageButton />
              </div>

              <div className="bg-secondary/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-4">
                  Demandez des tokens ERC-20 pour tester les fonctionnalités de notre application. Vous pouvez demander
                  jusqu'à 10 tokens par jour.
                </p>

                <div className="flex flex-col space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="amount" className="text-sm font-medium">
                      Quantité de tokens
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        id="amount"
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-background/50"
                      />
                      <Button
                        type="submit"
                        disabled={!address || isPending || isConfirming || !isCorrectNetwork}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isPending || isConfirming ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {isPending ? "Confirmation..." : "Transaction..."}
                          </>
                        ) : (
                          <>
                            <Droplets className="h-4 w-4 mr-2" />
                            Demander
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {!isCorrectNetwork && isConnected && (
                  <p className="text-xs text-destructive mt-2 text-center">
                    Vous devez être connecté au réseau Polygon Amoy pour demander des tokens.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <Alert className="bg-destructive/10 border-destructive/30 text-foreground">
                <AlertCircle className="h-4 w-4 text-destructive mr-2" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-500/10 border-green-500/30 text-foreground">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

