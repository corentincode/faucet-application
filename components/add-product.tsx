"use client"

import { useState } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle, Tag } from 'lucide-react'
import { parseEther } from "viem"
import { marketplaceABI } from "@/lib/marketplace-abi"
import { MARKETPLACE_ADDRESS, NFT_ADDRESS } from "@/lib/constants"

export function AddProduct() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [tokenId, setTokenId] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { address, isConnected } = useAccount()

  const { writeContract, isPending, data: hash } = useWriteContract()

  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  // Reset form on success
  if (isSuccess && !success) {
    setSuccess(`Produit "${name}" ajouté avec succès!`)
    setName("")
    setDescription("")
    setPrice("")
    setTokenId("")
    setImageUrl("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!address) {
      setError("Veuillez connecter votre portefeuille")
      return
    }

    if (!name || !description || !price || !tokenId) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      // Créer les métadonnées du produit
      const metadata = JSON.stringify({
        name,
        description,
        image: imageUrl || "https://via.placeholder.com/500",
      })

      console.log("Tentative d'ajout de produit:", {
        name,
        description,
        price: parseEther(price),
        nftContract: NFT_ADDRESS,
        tokenId: BigInt(tokenId),
        metadata
      })

      await writeContract({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: marketplaceABI,
        functionName: "addProduct",
        args: [
          name,
          description,
          parseEther(price),
          NFT_ADDRESS as `0x${string}`,
          BigInt(tokenId),
          metadata
        ],
      })
    } catch (err) {
      console.error("Erreur lors de l'ajout du produit:", err)
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <Card className="backdrop-blur-sm bg-secondary/30 border-border overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Tag className="h-5 w-5 mr-2" />
          Mettre un NFT en vente
        </CardTitle>
        <CardDescription>Listez votre NFT sur le marketplace pour le vendre</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Nom du produit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div>
            <Textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background/50"
              rows={3}
            />
          </div>
          <div>
            <Input
              placeholder="Prix (en TEST)"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div>
            <Input
              placeholder="ID du token NFT"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div>
            <Input
              placeholder="URL de l'image (optionnel)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <Button
            type="submit"
            disabled={!isConnected || isPending || isConfirming}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isPending ? "Confirmation..." : "Transaction en cours..."}
              </>
            ) : (
              "Mettre en vente"
            )}
          </Button>

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
