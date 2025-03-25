"use client"

import type React from "react"

import { useState } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle, Package, Plus, Pencil } from 'lucide-react'
import { parseEther, formatEther } from "viem"
import { marketplaceABI } from "@/lib/marketplace-abi"
import { MARKETPLACE_ADDRESS } from "@/lib/marketplace-constants"
import { useIsContractOwner } from "@/lib/contract-utils"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Product {
  id: bigint
  name: string
  description: string
  price: bigint
  active: boolean
}

export function MarketplaceAdmin() {
  const [productName, setProductName] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { address, isConnected } = useAccount()
  const { isOwner } = useIsContractOwner(address as `0x${string}` | undefined)

  // Read all products
  const { data: products, refetch: refetchProducts } = useReadContract({
    address: MARKETPLACE_ADDRESS as `0x${string}`,
    abi: marketplaceABI,
    functionName: "getActiveProducts",
    query: {
      enabled: isConnected && isOwner,
    },
  })

  const { writeContract, isPending } = useWriteContract()

  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: isPending ? undefined : undefined,
  })

  // Reset form
  const resetForm = () => {
    setProductName("")
    setProductDescription("")
    setProductPrice("")
    setEditingProduct(null)
    setIsActive(true)
  }

  // Handle add product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!isOwner) {
      setError("Vous n'êtes pas autorisé à ajouter des produits")
      return
    }

    if (!productName || !productDescription || !productPrice) {
      setError("Veuillez remplir tous les champs")
      return
    }

    try {
      const parsedPrice = parseEther(productPrice)

      await writeContract({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: marketplaceABI,
        functionName: "addProduct",
        args: [productName, productDescription, parsedPrice],
      })

      setSuccess("Produit ajouté avec succès!")
      resetForm()
      refetchProducts()
    } catch (err) {
      console.error("Erreur lors de l'ajout du produit:", err)
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Handle update product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!isOwner || !editingProduct) {
      setError("Vous n'êtes pas autorisé à modifier ce produit")
      return
    }

    if (!productName || !productDescription || !productPrice) {
      setError("Veuillez remplir tous les champs")
      return
    }

    try {
      const parsedPrice = parseEther(productPrice)

      await writeContract({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: marketplaceABI,
        functionName: "updateProduct",
        args: [editingProduct.id, productName, productDescription, parsedPrice, isActive],
      })

      setSuccess("Produit mis à jour avec succès!")
      resetForm()
      refetchProducts()
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
    setIsActive(product.active)
  }

  if (!isOwner) {
    return null
  }

  return (
    <Card className="backdrop-blur-sm bg-secondary/30 border-border overflow-hidden mt-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Gestion des produits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="space-y-4">
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
                type="number"
                min="0.1"
                step="0.1"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                className="bg-background/50"
                placeholder="Ex: 5"
              />
            </div>

            {editingProduct && (
              <div className="flex items-center space-x-2">
                <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="isActive">Produit actif</Label>
              </div>
            )}
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
                  {isPending ? "Confirmation..." : "Transaction..."}
                </>
              ) : editingProduct ? (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Mettre à jour
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </>
              )}
            </Button>

            {editingProduct && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </form>

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
          <h3 className="text-lg font-medium mb-4">Produits existants</h3>

          {products && products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(products as Product[]).map((product) => (
                  <TableRow key={product.id.toString()}>
                    <TableCell>{product.id.toString()}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{formatEther(product.price)} TEST</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${product.active ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"}`}
                      >
                        {product.active ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setProductToEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">Aucun produit trouvé</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}