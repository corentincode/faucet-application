"use client"

import { useState, useEffect } from "react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { marketplaceABI } from "@/lib/marketplace-abi"
import { tokenABI } from "@/lib/token-abi"
import { MARKETPLACE_ADDRESS, TOKEN_ADDRESS } from "@/lib/constants"
import { formatEther, parseEther } from "viem"
import { Skeleton } from "@/components/ui/skeleton"
import { Store, Tag, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { motion } from "framer-motion"

// Interface Product
interface Product {
  id: bigint
  name: string
  description: string
  price: bigint
  seller: `0x${string}`
  active: boolean
  nftContract: `0x${string}`
  tokenId: bigint
  metadata: string
  parsedMetadata?: {
    name: string
    description: string
    image: string
  }
}

export function Marketplace() {
  const { address, isConnected } = useAccount()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [buyingProductId, setBuyingProductId] = useState<bigint | null>(null)

  // Lire les produits actifs
  const { data: activeProducts, refetch } = useReadContract({
    address: MARKETPLACE_ADDRESS as `0x${string}`,
    abi: marketplaceABI,
    functionName: "getActiveProducts",
    query: {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  })

  // Vérifier l'allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: tokenABI,
    functionName: "allowance",
    args: [address || "0x0000000000000000000000000000000000000000", MARKETPLACE_ADDRESS],
    query: {
      enabled: !!address,
    },
  })

  // Fonctions pour approuver et acheter
  const { writeContract: writeApprove, isPending: isApprovePending } = useWriteContract()
  const { writeContract: writePurchase, isPending: isPurchasePending } = useWriteContract()

  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: isApprovePending ? undefined : undefined,
  })

  const { isSuccess: isPurchaseSuccess } = useWaitForTransactionReceipt({
    hash: isPurchasePending ? undefined : undefined,
  })

  // Traiter les produits pour extraire les métadonnées
  useEffect(() => {
    if (activeProducts) {
      console.log("Produits actifs récupérés:", activeProducts)
      
      const processedProducts = (activeProducts as Product[]).map(product => {
        try {
          if (product.metadata) {
            const parsedMetadata = JSON.parse(product.metadata);
            return {
              ...product,
              parsedMetadata
            };
          }
          return product;
        } catch (e) {
          console.error("Erreur lors du parsing des métadonnées:", e);
          return product;
        }
      });
      
      setProducts(processedProducts);
      setIsLoading(false);
    }
  }, [activeProducts])

  // Mettre à jour après une approbation réussie
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance()
      setSuccess("Approbation réussie! Vous pouvez maintenant acheter le produit.")
    }
  }, [isApproveSuccess, refetchAllowance])

  // Mettre à jour après un achat réussi
  useEffect(() => {
    if (isPurchaseSuccess) {
      refetch()
      setBuyingProductId(null)
      setSuccess("Achat réussi! Le NFT a été transféré à votre portefeuille.")
    }
  }, [isPurchaseSuccess, refetch])

  // Fonction pour approuver le marketplace à dépenser les tokens
  const handleApprove = async (product: Product) => {
    setError("")
    setSuccess("")
    setBuyingProductId(product.id)

    try {
      console.log("Tentative d'approbation pour le Marketplace:", MARKETPLACE_ADDRESS)

      await writeApprove({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: tokenABI,
        functionName: "approve",
        args: [MARKETPLACE_ADDRESS, product.price],
      })
    } catch (err) {
      console.error("Erreur lors de l'approbation:", err)
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
      setBuyingProductId(null)
    }
  }

  // Fonction pour acheter un produit
  const handlePurchase = async (product: Product) => {
    setError("")
    setSuccess("")
    setBuyingProductId(product.id)

    try {
      console.log("Tentative d'achat du produit:", product.id.toString())

      await writePurchase({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: marketplaceABI,
        functionName: "purchaseProduct",
        args: [product.id],
      })
    } catch (err) {
      console.error("Erreur lors de l'achat:", err)
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
      setBuyingProductId(null)
    }
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
          <CardTitle className="text-lg flex items-center">
            <Store className="h-5 w-5 mr-2" />
            Marketplace
          </CardTitle>
          <CardDescription>Découvrez et achetez des NFTs uniques</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="bg-destructive/10 border-destructive/30 text-foreground mb-4">
              <AlertCircle className="h-4 w-4 text-destructive mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-500/10 border-green-500/30 text-foreground mb-4">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-secondary/50 p-4 rounded-lg">
                  <Skeleton className="h-40 w-full mb-2" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product.id.toString()} className="bg-secondary/50 p-4 rounded-lg border border-border">
                  {product.parsedMetadata?.image && (
                    <div className="aspect-square bg-background/50 rounded-md mb-3 overflow-hidden">
                      <img 
                        src={product.parsedMetadata.image || "/placeholder.svg"} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start mb-2">
                    <Tag className="h-4 w-4 text-primary mt-1 mr-2 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                    </div>
                  </div>
                  <p className="text-sm mb-1">
                    <span className="font-medium">{formatEther(product.price)} TEST</span>
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Vendeur: {product.seller.substring(0, 6)}...{product.seller.substring(38)}
                  </p>
                  
                  {address === product.seller ? (
                    <Button disabled className="w-full">
                      Vous ne pouvez pas acheter votre propre produit
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        // Vérifier si l'utilisateur a déjà approuvé suffisamment de tokens
                        if (allowance && allowance >= product.price) {
                          handlePurchase(product)
                        } else {
                          handleApprove(product)
                        }
                      }}
                      disabled={!isConnected || isApprovePending || isPurchasePending || buyingProductId === product.id}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isApprovePending || isPurchasePending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {isApprovePending ? "Approbation..." : "Achat..."}
                        </>
                      ) : allowance && allowance >= product.price ? (
                        "Acheter"
                      ) : (
                        "Approuver et acheter"
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun produit disponible pour le moment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
