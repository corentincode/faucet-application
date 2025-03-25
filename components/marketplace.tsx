"use client"

import { useState, useEffect } from "react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { marketplaceABI } from "@/lib/marketplace-abi"
import { tokenABI } from "@/lib/token-abi"
import { MARKETPLACE_ADDRESS, TOKEN_ADDRESS } from "@/lib/constants"
import { formatEther } from "viem"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Store,
  AlertCircle,
  Loader2,
  CheckCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  User,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [buyingProductId, setBuyingProductId] = useState<bigint | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [sortOption, setSortOption] = useState<string>("newest")
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [productAllowances, setProductAllowances] = useState<Record<string, boolean>>({})

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
  const { writeContract: writeApprove, isPending: isApprovePending, data: approveTxHash } = useWriteContract()
  const { writeContract: writePurchase, isPending: isPurchasePending, data: purchaseTxHash } = useWriteContract()

  const {
    isSuccess: isApproveSuccess,
    isLoading: isApproveConfirming,
    data: approveReceipt,
  } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  })

  const {
    isSuccess: isPurchaseSuccess,
    isLoading: isPurchaseConfirming,
    data: purchaseReceipt,
  } = useWaitForTransactionReceipt({
    hash: purchaseTxHash,
  })

  // Fonction pour rafraîchir manuellement les données
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError("")
    setSuccess("")

    try {
      await refetch()
      if (address) {
        await refetchAllowance()
      }
      setSuccess("Données rafraîchies avec succès!")
    } catch (err) {
      console.error("Erreur lors du rafraîchissement des données:", err)
      setError("Erreur lors du rafraîchissement des données")
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  // Traiter les produits pour extraire les métadonnées
  useEffect(() => {
    if (activeProducts) {
      console.log("Produits actifs récupérés:", activeProducts)

      const processedProducts = (activeProducts as Product[])
        .filter((product) => product.active) // Filtrer uniquement les produits actifs
        .map((product) => {
          try {
            if (product.metadata) {
              const parsedMetadata = JSON.parse(product.metadata)
              return {
                ...product,
                parsedMetadata,
              }
            }
            return product
          } catch (e) {
            console.error("Erreur lors du parsing des métadonnées:", e)
            return product
          }
        })

      setProducts(processedProducts)
      setIsLoading(false)
    }
  }, [activeProducts])

  // Filtrer et trier les produits
  useEffect(() => {
    let result = [...products]

    // Filtrer par terme de recherche
    if (searchTerm) {
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.tokenId.toString().includes(searchTerm),
      )
    }

    // Trier les produits
    switch (sortOption) {
      case "price-low":
        result.sort((a, b) => Number(a.price - b.price))
        break
      case "price-high":
        result.sort((a, b) => Number(b.price - a.price))
        break
      case "newest":
        // Par défaut, supposons que les IDs plus élevés sont les plus récents
        result.sort((a, b) => Number(b.id - a.id))
        break
      case "oldest":
        result.sort((a, b) => Number(a.id - b.id))
        break
    }

    setFilteredProducts(result)
  }, [products, searchTerm, sortOption])

  // Vérifier les allowances pour chaque produit
  useEffect(() => {
    if (allowance && address) {
      const newAllowances: Record<string, boolean> = {}

      products.forEach((product) => {
        newAllowances[product.id.toString()] = BigInt(allowance.toString()) >= product.price
      })

      setProductAllowances(newAllowances)
    }
  }, [allowance, products, address])

  // Mettre à jour après une approbation réussie
  useEffect(() => {
    if (isApproveSuccess && buyingProductId) {
      // Mettre à jour l'allowance
      refetchAllowance().then(() => {
        // Mettre à jour l'état pour ce produit spécifique
        setProductAllowances((prev) => ({
          ...prev,
          [buyingProductId.toString()]: true,
        }))

        setSuccess("Approbation réussie! Vous pouvez maintenant acheter le produit.")

        // Si nous sommes dans le détail d'un produit, mettre à jour le produit sélectionné
        if (selectedProduct && selectedProduct.id === buyingProductId) {
          setSelectedProduct({
            ...selectedProduct,
            // Marquer comme approuvé
          })
        }
      })
    }
  }, [isApproveSuccess, buyingProductId, refetchAllowance, selectedProduct])

  // Mettre à jour après un achat réussi
  useEffect(() => {
    if (isPurchaseSuccess) {
      refetch()
      setBuyingProductId(null)
      setSuccess("Achat réussi! Le NFT a été transféré à votre portefeuille.")
      setIsDetailOpen(false)
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

  // Ouvrir le détail d'un produit
  const openProductDetail = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailOpen(true)
  }

  // Fonction pour effacer la recherche
  const clearSearch = () => {
    setSearchTerm("")
  }

  // Vérifier si un produit est approuvé
  const isProductApproved = (product: Product) => {
    // Si l'utilisateur est le vendeur, retourner false pour éviter l'achat
    if (address && product.seller.toLowerCase() === address.toLowerCase()) {
      return false
    }
    return productAllowances[product.id.toString()] === true
  }

  return (
    <div className="space-y-6">
      {/* En-tête du Marketplace */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Store className="h-8 w-8 mr-3 text-primary" />
            Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">Découvrez et achetez des NFTs uniques créés par notre communauté</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-secondary/50 border-border"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un NFT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 bg-background/50"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Trier par</span>
              <ArrowUpDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortOption("newest")}>Plus récents</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOption("oldest")}>Plus anciens</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOption("price-low")}>Prix: croissant</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOption("price-high")}>Prix: décroissant</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages d'erreur et de succès */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="bg-destructive/10 border-destructive/30 text-foreground mb-4">
              <AlertCircle className="h-4 w-4 text-destructive mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="bg-green-500/10 border-green-500/30 text-foreground mb-4">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grille de produits */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-secondary/30 rounded-xl overflow-hidden border border-border/40 backdrop-blur-sm"
            >
              <Skeleton className="h-64 w-full" />
              <div className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id.toString()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="bg-secondary/30 rounded-xl overflow-hidden border border-border/40 backdrop-blur-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div
                  className="aspect-square bg-background/50 overflow-hidden cursor-pointer relative"
                  onClick={() => openProductDetail(product)}
                >
                  <img
                    src={product.parsedMetadata?.image || "/placeholder.svg?height=500&width=500"}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?height=500&width=500"
                    }}
                  />

                  {/* Badge "Vous" pour les produits de l'utilisateur connecté */}
                  {address && product.seller.toLowerCase() === address.toLowerCase() && (
                    <div className="absolute top-2 left-2 bg-primary/80 text-primary-foreground px-2 py-1 rounded-md text-xs font-medium flex items-center backdrop-blur-sm">
                      <User className="h-3 w-3 mr-1" />
                      Vous
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3
                      className="font-semibold text-lg truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => openProductDetail(product)}
                    >
                      {product.name}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      #{product.tokenId.toString()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 h-10">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-lg">{formatEther(product.price)} TEST</p>
                    <Button
                      onClick={() => openProductDetail(product)}
                      size="sm"
                      variant="outline"
                      className="border-primary/50 hover:bg-primary/10"
                    >
                      Voir détails
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-16 bg-secondary/20 rounded-xl border border-border/40">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">Aucun NFT disponible</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {searchTerm
              ? "Aucun NFT ne correspond à votre recherche. Essayez d'autres termes ou effacez votre recherche."
              : "Il n'y a actuellement aucun NFT disponible sur le marketplace. Revenez plus tard ou créez le vôtre !"}
          </p>
          {searchTerm && (
            <Button variant="outline" className="mt-4" onClick={clearSearch}>
              Effacer la recherche
            </Button>
          )}
        </div>
      )}

      {/* Modal de détail du produit */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
          {selectedProduct && (
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2 bg-background/50 relative">
                <div className="aspect-square">
                  <img
                    src={selectedProduct.parsedMetadata?.image || "/placeholder.svg?height=500&width=500"}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?height=500&width=500"
                    }}
                  />
                </div>

                {/* Badge "Vous" pour les produits de l'utilisateur connecté */}
                {address && selectedProduct.seller.toLowerCase() === address.toLowerCase() && (
                  <div className="absolute top-2 left-2 bg-primary/80 text-primary-foreground px-2 py-1 rounded-md text-xs font-medium flex items-center backdrop-blur-sm">
                    <User className="h-3 w-3 mr-1" />
                    Vous
                  </div>
                )}
              </div>
              <div className="md:w-1/2 p-6 flex flex-col">
                <DialogHeader>
                  <div className="flex justify-between items-start">
                    <DialogTitle className="text-xl font-bold">{selectedProduct.name}</DialogTitle>
                    <Badge variant="outline">#{selectedProduct.tokenId.toString()}</Badge>
                  </div>
                  <DialogDescription className="mt-2">{selectedProduct.description}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 mt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Prix</span>
                    <span className="font-semibold text-xl">{formatEther(selectedProduct.price)} TEST</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Vendeur</span>
                    <div className="flex items-center">
                      {address && selectedProduct.seller.toLowerCase() === address.toLowerCase() && (
                        <Badge variant="secondary" className="mr-2">
                          Vous
                        </Badge>
                      )}
                      <span className="font-mono text-sm">
                        {selectedProduct.seller.substring(0, 6)}...{selectedProduct.seller.substring(38)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {address && selectedProduct.seller.toLowerCase() === address.toLowerCase() ? (
                    <Button disabled className="w-full bg-muted text-muted-foreground">
                      Vous ne pouvez pas acheter votre propre NFT
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        // Vérifier si l'utilisateur a déjà approuvé suffisamment de tokens
                        if (isProductApproved(selectedProduct)) {
                          handlePurchase(selectedProduct)
                        } else {
                          handleApprove(selectedProduct)
                        }
                      }}
                      disabled={
                        !isConnected ||
                        isApprovePending ||
                        isPurchasePending ||
                        isApproveConfirming ||
                        isPurchaseConfirming
                      }
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isApprovePending || isApproveConfirming ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Approbation...
                        </>
                      ) : isPurchasePending || isPurchaseConfirming ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Achat...
                        </>
                      ) : isProductApproved(selectedProduct) ? (
                        "Acheter maintenant"
                      ) : (
                        "Approuver et acheter"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

