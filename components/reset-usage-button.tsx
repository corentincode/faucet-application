"use client"

import { useState } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle } from "lucide-react"
import { tokenABI } from "@/lib/token-abi"
import { TOKEN_ADDRESS } from "@/lib/constants"

export function ResetUsageButton() {
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const { address } = useAccount()

  const { writeContract, isPending: isWritePending, data: writeData } = useWriteContract()

  const { isSuccess: isConfirmSuccess, isLoading: isConfirmLoading } = useWaitForTransactionReceipt({
    hash: writeData?.hash,
  })

  const handleResetUsage = async () => {
    setResetError(null)
    setResetSuccess(null)
    setIsResetting(true)

    if (!address) {
      setResetError("Veuillez connecter votre portefeuille.")
      setIsResetting(false)
      return
    }

    try {
      await writeContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: tokenABI,
        functionName: "mint",
        args: [address, 0n], // Minting 0 tokens effectively resets usage
      })
    } catch (error: any) {
      console.error("Erreur lors de la réinitialisation de l'utilisation:", error)
      setResetError(`Erreur: ${error?.message || "Une erreur s'est produite."}`)
      setIsResetting(false)
    } finally {
      setIsResetting(false)
    }
  }

  if (isConfirmSuccess && !resetSuccess) {
    setResetSuccess("L'utilisation quotidienne a été réinitialisée!")
  }

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleResetUsage}
        disabled={isResetting || isWritePending || isConfirmLoading}
        className="bg-secondary/50 backdrop-blur-sm border-border hover:bg-secondary/70"
      >
        {isResetting || isWritePending || isConfirmLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Réinitialisation...
          </>
        ) : (
          "Réinitialiser l'utilisation"
        )}
      </Button>
      {resetError && (
        <Alert className="bg-destructive/10 border-destructive/30 text-foreground mt-2">
          <AlertCircle className="h-4 w-4 text-destructive mr-2" />
          <AlertDescription>{resetError}</AlertDescription>
        </Alert>
      )}
      {resetSuccess && (
        <Alert className="bg-green-500/10 border-green-500/30 text-foreground mt-2">
          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
          <AlertDescription>{resetSuccess}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

