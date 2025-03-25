"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle, Settings } from "lucide-react"
import { parseEther } from "viem"
import { TOKEN_ADDRESS } from "@/lib/constants"
import { useIsContractOwner } from "@/lib/contract-utils"

export function AdminPanel() {
  const [newLimit, setNewLimit] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { address, isConnected } = useAccount()
  const { isOwner } = useIsContractOwner(address as `0x${string}` | undefined)

  const { writeContract, isPending, data: hash } = useWriteContract()

  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  // Utiliser useEffect pour gérer le succès de la transaction
  useEffect(() => {
    if (isSuccess && !success) {
      setSuccess(`La limite quotidienne a été mise à jour à ${newLimit} tokens!`)
    }
  }, [isSuccess, success, newLimit])

  const handleSetDailyLimit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!address) {
      setError("Veuillez connecter votre portefeuille")
      return
    }

    if (!isOwner) {
      setError("Vous n'êtes pas autorisé à modifier la limite quotidienne")
      return
    }

    if (!newLimit || Number.parseFloat(newLimit) <= 0) {
      setError("Veuillez entrer une limite valide")
      return
    }

    try {
      // Utiliser un ABI spécifique pour cette fonction
      const setDailyLimitABI = [
        {
          inputs: [{ internalType: "uint256", name: "newLimit", type: "uint256" }],
          name: "setDailyLimit",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ]

      await writeContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: setDailyLimitABI,
        functionName: "setDailyLimit",
        args: [parseEther(newLimit)],
      })
    } catch (err) {
      console.error("Erreur lors de la modification de la limite:", err)
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Si l'utilisateur n'est pas le propriétaire, ne pas afficher le panneau
  if (!isOwner) {
    return null
  }

  return (
    <Card className="backdrop-blur-sm bg-secondary/30 border-border overflow-hidden mt-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Administration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSetDailyLimit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="dailyLimit" className="text-sm font-medium">
              Nouvelle limite quotidienne (tokens)
            </label>
            <div className="flex space-x-2">
              <Input
                id="dailyLimit"
                type="number"
                min="1"
                step="1"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="bg-background/50"
                placeholder="Ex: 100"
              />
              <Button
                type="submit"
                disabled={!address || isPending || isConfirming}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isPending ? "Confirmation..." : "Transaction..."}
                  </>
                ) : (
                  "Mettre à jour"
                )}
              </Button>
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
  )
}

