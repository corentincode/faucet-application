"use client"

import { useState, useEffect } from "react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle, Plus, Pencil, Store, Tag } from 'lucide-react'
import { parseEther, formatEther } from "viem"
import { marketplaceABI } from "@/lib/marketplace-abi"
import { MARKETPLACE_ADDRESS } from "@/lib/constants"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"
import { Skeleton } from "./ui/skeleton"

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

export function MyProducts() {
  const [productName, setProductName] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { address, isConnected } = useAccount()

  // Read user's products
  const {
    data: myProducts,
    refetch: refetchProducts,
    isLoading: isLoadingProducts,
  } = useReadContract({
    address: MARKETPLACE_ADDRESS as `0x${string}`,
    abi: marketplaceABI,
    functionName: "getProductsBySeller",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  })

  const { writeContract, isPending, data: hash } = useWriteContract()

  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  // Process products to parse metadata
  const [processedProducts, setProcessedProducts] = useState<Product[]>([])
  
  useEffect(() => {
    if (myProducts) {
      const processed = (myProducts as Product[]).map(product => {
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
      setProcessedProducts(processed);
    }
  }, [myProducts]);

  // Update success state and reset form
  useEffect(() => {
    if (isSuccess && !success) {
      setSuccess(editingProduct ? "Produit mis à jour avec succès!" : "Produit ajouté avec succès!")
      resetForm()
      refetchProducts()
    }
  }, [isSuccess, success, editingProduct, refetchProducts])

  // Reset form
  const resetForm = () => {
    setProductName("")
    setProductDescription("")
    setProductPrice("")
    setImageUrl("")
    setEditingProduct(null)
    setIsActive(true)
    setSuccess("")
    setError("")
  }

  // Handle update product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!address || !editingProduct) {
      setError("Vous n'êtes pas autorisé à modifier ce produit")
      return
    }

    if (!productName || !productDescription || !productPrice) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      // Mettre à jour les métadonnées
      const metadata = JSON.stringify({
        name: productName,
        description: productDescription,
        image: imageUrl || (editingProduct.parsedMetadata?.image || "https://via.placeholder.com/500"),
      })

      console.log("Tentative de mise à jour du produit:", {
        id: editingProduct.id.toString(),
        name: productName,
        description: productDescription,
        price: parseEther(productPrice),
        active: isActive,
        metadata
      })

      await writeContract({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: marketplaceABI,
        functionName: "updateProduct",
        args: [
          editingProduct.id,
          productName,
          productDescription,
          parseEther(productPrice),
          isActive,
          metadata
        ],
      })
    } catch (err) {
      console.error("Erreur lors de la mise à jour du produit:", err)
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Set editing product
  const setProductToEdit = (product: Product) => {
    setEditingProduct(product)
    setProductName(product.name)
    setProductDescription(product.description)
    setProductPrice(formatEther(product.price))
    setImageUrl(product.parsedMetadata?.image || "")
    setIsActive(product.active)
  }

  if (!isConnected) {
    return null
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
            Mes Produits
          </CardTitle>
          <CardDescription>Gérez vos produits sur le marketplace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {editingProduct && (
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="productName">Nom du produit</Label>
                  <Input
                    id="productName"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="bg-background/50"
                    placeholder="Ex: NFT Exclusif"
                  />
                </div>

                <div>
                  <Label htmlFor="productDescription">Description</Label>
                  <Textarea
                    id="productDescription"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    className="bg-background/50"
                    placeholder="Description du produit..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="productPrice">Prix (TEST)</Label>
                  <Input
                    id="productPrice"
                    type="text"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="bg-background/50"
                    placeholder="Ex: 5"
                  />
                </div>

                <div>
                  <Label htmlFor="imageUrl">URL de l'image (optionnel)</Label>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="bg-background/50"
                    placeholder="https://exemple.com/image.jpg"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                  <Label htmlFor="isActive">Produit actif</Label>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={isPending || isConfirming}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isPending || isConfirming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isPending ? "Confirmation..." : "Transaction en cours..."}
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      Mettre à jour
                    </>
                  )}
                </Button>

                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              </div>
            </form>
          )}

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

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-4">Mes produits</h3>

            {isLoadingProducts ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-secondary/50 p-4 rounded-lg">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                ))}
              </div>
            ) : processedProducts && processedProducts.length > 0 ? (
              <div className="space-y-4">
                {processedProducts.map((product) => (
                  <div key={product.id.toString()} className="bg-secondary/50 p-4 rounded-lg border border-border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {product.parsedMetadata?.image && (
                          <div className="aspect-square w-full max-w-[120px] bg-background/50 rounded-md mb-3 overflow-hidden float-right ml-3">
                            <img 
                              src={product.parsedMetadata.image || "/placeholder.svg"} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 text-primary mr-2" />
                          <h4 className="font-medium">{product.name}</h4>
                          <span
                            className={`ml-2 px-2 py-0.5 rounded-full text-xs ${product.active ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"}`}
                          >
                            {product.active ? "Actif" : "Inactif"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                        <p className="text-sm font-medium mt-2">{formatEther(product.price)} TEST</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          NFT ID: {product.tokenId.toString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setProductToEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Vous n'avez pas encore de produits</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
