"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle, Tag } from "lucide-react"
import { parseEther } from "viem"
import { marketplaceABI } from "@/lib/marketplace-abi"
import { nftABI } from "@/lib/nft-abi"
import { MARKETPLACE_ADDRESS, NFT_ADDRESS } from "@/lib/constants"
import { useSearchParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"

// Composant qui utilise useSearchParams enveloppé dans Suspense
function AddProductForm() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("0.1")
  const [tokenId, setTokenId] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const { address, isConnected } = useAccount()
  const searchParams = useSearchParams()
  const publicClient = usePublicClient()

  // Récupérer les paramètres de l'URL
  useEffect(() => {
    if (searchParams) {
      const tokenIdParam = searchParams.get("tokenId")
      const nameParam = searchParams.get("name")
      const descriptionParam = searchParams.get("description")
      const imageParam = searchParams.get("image")

      if (tokenIdParam) setTokenId(tokenIdParam)
      if (nameParam) setName(nameParam)
      if (descriptionParam) setDescription(descriptionParam)
      if (imageParam) setImageUrl(imageParam)
    }
  }, [searchParams])

  const { writeContract: approveNFT, isPending: isApprovePending, data: approveTxHash } = useWriteContract()
  const { writeContract: addProduct, isPending: isAddingProduct, data: addProductTxHash } = useWriteContract()

  const { isSuccess: isApproveSuccess, isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  })

  const { isSuccess: isAddProductSuccess, isLoading: isAddProductConfirming } = useWaitForTransactionReceipt({
    hash: addProductTxHash,
  })

  // Vérifier si le NFT est approuvé pour le marketplace
  useEffect(() => {
    const checkApproval = async () => {
      if (!tokenId || !address || !publicClient) return

      try {
        const approved = await publicClient.readContract({
          address: NFT_ADDRESS as `0x${string}`,
          abi: nftABI,
          functionName: "getApproved",
          args: [BigInt(tokenId)],
        })

        if ((approved as string).toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase()) {
          console.log(`Le NFT #${tokenId} est déjà approuvé pour le marketplace.`)
        } else {
          console.log(`Le NFT #${tokenId} n'est pas approuvé pour le marketplace.`)
          setIsApproving(true)
        }
      } catch (err) {
        console.error("Erreur lors de la vérification de l'approbation:", err)
      }
    }

    if (tokenId) {
      checkApproval()
    }
  }, [tokenId, address, publicClient])

  // Effet pour gérer l'approbation réussie
  useEffect(() => {
    if (isApproveSuccess) {
      console.log(`Approbation réussie pour le NFT #${tokenId}`)
      setIsApproving(false)
    }
  }, [isApproveSuccess, tokenId])

  // Effet pour gérer l'ajout de produit réussi
  useEffect(() => {
    if (isAddProductSuccess && !success) {
      setSuccess(`Produit "${name}" ajouté avec succès!`)
      // Ne pas réinitialiser les champs pour permettre à l'utilisateur de voir ce qui a été ajouté
    }
  }, [isAddProductSuccess, name, success])

  const handleApprove = async () => {
    if (!tokenId || !address) return

    setError("")
    setSuccess("")

    try {
      await approveNFT({
        address: NFT_ADDRESS as `0x${string}`,
        abi: nftABI,
        functionName: "approve",
        args: [MARKETPLACE_ADDRESS as `0x${string}`, BigInt(tokenId)],
      })
    } catch (err) {
      console.error("Erreur lors de l'approbation:", err)
      setError(`Erreur d'approbation: ${err instanceof Error ? err.message : String(err)}`)
    }
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
      // Vérifier si le NFT est approuvé pour le marketplace
      if (isApproving) {
        await handleApprove()
        return
      }

      // Créer les métadonnées du produit
      const metadata = JSON.stringify({
        name,
        description,
        image: imageUrl || "https://via.placeholder.com/500",
      })

      console.log("Tentative d'ajout de produit:", {
        nftContract: NFT_ADDRESS,
        tokenId: BigInt(tokenId),
        name,
        description,
        price: parseEther(price),
        metadata,
      })

      // Utiliser l'ordre correct des arguments selon l'ABI
      await addProduct({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: marketplaceABI,
        functionName: "addProduct",
        args: [name, description, parseEther(price), NFT_ADDRESS as `0x${string}`, BigInt(tokenId), metadata],
      })
    } catch (err) {
      console.error("Erreur lors de l'ajout du produit:", err)
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
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
          disabled={!!searchParams.get("tokenId")}
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
        disabled={!isConnected || isApprovePending || isApproveConfirming || isAddingProduct || isAddProductConfirming}
        className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
      >
        {isApprovePending || isApproveConfirming ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Approbation en cours...
          </>
        ) : isAddingProduct || isAddProductConfirming ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {isAddingProduct ? "Confirmation..." : "Transaction en cours..."}
          </>
        ) : isApproving ? (
          "Approuver pour le Marketplace"
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
  )
}

// Composant de chargement pour Suspense
function AddProductLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

// Composant principal qui utilise Suspense
export function AddProduct() {
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
        <Suspense fallback={<AddProductLoading />}>
          <AddProductForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}

