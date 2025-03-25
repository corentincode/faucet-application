"use client"

import { useState, useEffect } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle, ShoppingBag, Tag, Info, User } from 'lucide-react'
import { formatEther } from "viem"
import { motion } from "framer-motion"
import { tokenABI } from "@/lib/token-abi"
import { TOKEN_ADDRESS } from "@/lib/constants"
import { marketplaceABI } from "@/lib/marketplace-abi"
import { MARKETPLACE_ADDRESS } from "@/lib/marketplace-constants"
import { balanceUpdateEvent } from "./faucet-form"
import { Skeleton } from "@/components/ui/skeleton"

interface Product {
  id: bigint
  name: string
  description: string
  price: bigint
  seller: `0x${string}`
  active: boolean
}

export function Marketplace() {
  const [purchaseStatus, setPurchaseStatus] = useState<{
    id: bigint
    status: "pending" | "success" | "error"
    message?: string
  } | null>(null)
  const { address, isConnected } = useAccount()

  // Read user's token balance
  const { data: balance } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: tokenABI,
    functionName: "balanceOf",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })

  // Read all products from marketplace
  const {
    data: products,
    isLoading: isLoadingProducts,
    refetch: refetchProducts,
  } = useReadContract({
    address: MARKETPLACE_ADDRESS as `0x${string}`,
    abi: marketplaceABI,
    functionName: "getActiveProducts",
    query: {
      enabled: true,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  })

  const formattedBalance = balance ? formatEther(balance as bigint) : "0"

  const { writeContract, isPending } = useWriteContract()

  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: purchaseStatus?.status === "pending" ? (purchaseStatus.id as unknown as `0x${string}`) : undefined,
  })

  // Function to approve marketplace to spend tokens
  const approveMarketplace = async (amount: bigint) => {
    if (!address) return

    try {
      await writeContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: tokenABI,
        functionName: "approve",
        args: [MARKETPLACE_ADDRESS as `0x${string}`, amount],
      })
      return true
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error)
      return false
    }
  }

  // Function to purchase a product
  const handlePurchase = async (product: Product) => {
    if (!address) return

    try {
      setPurchaseStatus({ id: product.id, status: "pending", message: "Approbation des tokens..." })

      // First approve the marketplace to spend tokens
      const approved = await approveMarketplace(product.price)
      if (!approved) {
        setPurchaseStatus({
          id: product.id,
          status: "error",
          message: "Échec de l'approbation des tokens",
        })
        return
      }

      setPurchaseStatus({ id: product.id, status: "pending", message: "Achat en cours..." })

      // Then purchase the product
      const tx = await writeContract({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: marketplaceABI,
        functionName: "purchaseProduct",
        args: [product.id],
      })

      // Update status with transaction hash
      setPurchaseStatus({ id: product.id, status: "pending" })

      // Status will be updated via useWaitForTransactionReceipt
    } catch (error) {
      console.error("Erreur lors de l'achat:", error)
      setPurchaseStatus({
        id: product.id,
        status: "error",
        message: error instanceof Error ? error.message : "Une erreur est survenue",
      })
    }
  }

  // Update status when transaction is confirmed
  useEffect(() => {
    if (isSuccess && purchaseStatus?.status === "pending") {
      setPurchaseStatus({
        id: purchaseStatus.id,
        status: "success",
        message: "Achat réussi ! Votre produit sera livré sous peu.",
      })

      // Trigger balance update
      window.dispatchEvent(balanceUpdateEvent)

      // Refetch products
      refetchProducts()
    }
  }, [isSuccess, purchaseStatus, refetchProducts])

  // Format seller address
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="backdrop-blur-sm bg-secondary/30 border-border overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShoppingBag className="h-5 w-5 text-primary mr-2" />
              <CardTitle className="text-lg">Marketplace</CardTitle>
            </div>
            <div className="text-sm text-muted-foreground">
              Solde:{" "}
              <span className="font-medium text-foreground">{Number.parseFloat(formattedBalance).toFixed(2)} TEST</span>
            </div>
          </div>
          <CardDescription>Achetez des produits et services avec vos tokens TEST</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden border border-border">
                  <div className="h-2 w-full bg-secondary/50"></div>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4 mt-2" />
                    <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
                    <Skeleton className="h-4 w-full mx-auto mb-4" />
                    <Skeleton className="h-4 w-1/4 mx-auto mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products && (products as Product[]).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(products as Product[]).map((product) => (
                <Card key={product.id.toString()} className="overflow-hidden border border-border">
                  <div className="h-2 w-full bg-gradient-to-r from-primary to-accent"></div>
                  <CardContent className="p-4">
                    <div className="flex justify-center mb-4 mt-2">
                      <div className="p-3 rounded-full bg-secondary/50">
                        <Tag className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-medium text-center mb-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">{product.description}</p>
                    <div className="text-center font-bold text-lg mb-2">
                      {formatEther(product.price)} <span className="text-sm font-normal">TEST</span>
                    </div>
                    <div className="flex items-center justify-center text-xs text-muted-foreground mb-4">
                      <User className="h-3 w-3 mr-1" />
                      <span>Vendeur: {formatAddress(product.seller)}</span>
                    </div>
                    <Button
                      onClick={() => handlePurchase(product)}
                      disabled={
                        !isConnected ||
                        isPending ||
                        isConfirming ||
                        (purchaseStatus?.id === product.id && purchaseStatus.status === "pending") ||
                        Number.parseFloat(formattedBalance) < Number.parseFloat(formatEther(product.price)) ||
                        product.seller.toLowerCase() === address?.toLowerCase()
                      }
                      className="w-full"
                      variant={
                        Number.parseFloat(formattedBalance) < Number.parseFloat(formatEther(product.price))
                          ? "outline"
                          : "default"
                      }
                    >
                      {purchaseStatus?.id === product.id && purchaseStatus.status === "pending" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {purchaseStatus.message || "Traitement..."}
                        </>
                      ) : Number.parseFloat(formattedBalance) < Number.parseFloat(formatEther(product.price)) ? (
                        "Solde insuffisant"
                      ) : product.seller.toLowerCase() === address?.toLowerCase() ? (
                        "Votre produit"
                      ) : (
                        "Acheter"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun produit disponible</h3>
              <p className="text-muted-foreground">Les produits seront bientôt disponibles. Revenez plus tard.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="block">
          {purchaseStatus?.status === "success" && (
            <Alert className="bg-green-500/10 border-green-500/30 text-foreground mt-4">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <AlertDescription>{purchaseStatus.message}</AlertDescription>
            </Alert>
          )}

          {purchaseStatus?.status === "error" && (
            <Alert className="bg-destructive/10 border-destructive/30 text-foreground mt-4">
              <AlertCircle className="h-4 w-4 text-destructive mr-2" />
              <AlertDescription>{purchaseStatus.message}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}