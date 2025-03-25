"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type React from "react"
import { useState, useEffect } from "react"
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle, Pencil, Store, Tag, ShoppingBag, RefreshCw, Plus } from "lucide-react"
import { parseEther, formatEther } from "viem"
import { marketplaceABI } from "@/lib/marketplace-abi"
import { nftABI } from "@/lib/nft-abi"
import { MARKETPLACE_ADDRESS, NFT_ADDRESS } from "@/lib/constants"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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

// Interface pour les NFTs possédés
interface OwnedNFT {
  tokenId: bigint
  tokenURI: string
  parsedMetadata?: {
    name: string
    description: string
    image: string
  }
  isListed: boolean
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
  const [activeTab, setActiveTab] = useState("owned")
  const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFT[]>([])
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [manualTokenId, setManualTokenId] = useState("")
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()

  // Fonction pour ajouter des logs
  const addLog = (message: string) => {
    console.log(message)
    setDebugLogs((prev) => [...prev, message])
  }

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

  // Fonction pour rafraîchir manuellement les données
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError("")
    setSuccess("")

    try {
      await refetchProducts()
      await fetchNFTs()
      setSuccess("Données rafraîchies avec succès!")
    } catch (err) {
      console.error("Erreur lors du rafraîchissement des données:", err)
      setError("Erreur lors du rafraîchissement des données")
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  // Fonction pour récupérer un NFT par son ID
  const fetchNFTById = async (tokenId: bigint) => {
    if (!address || !publicClient) return null

    try {
      // Vérifier si l'utilisateur est le propriétaire du NFT
      const owner = await publicClient.readContract({
        address: NFT_ADDRESS as `0x${string}`,
        abi: nftABI,
        functionName: "ownerOf",
        args: [tokenId],
      })

      // Si l'utilisateur n'est pas le propriétaire, retourner null
      if ((owner as string).toLowerCase() !== address.toLowerCase()) {
        addLog(`Le NFT #${tokenId.toString()} ne vous appartient pas`)
        return null
      }

      // Récupérer l'URI du token
      const tokenURI = await publicClient.readContract({
        address: NFT_ADDRESS as `0x${string}`,
        abi: nftABI,
        functionName: "tokenURI",
        args: [tokenId],
      })

      addLog(
        `URI du token ${tokenId}: ${typeof tokenURI === "string" ? tokenURI.substring(0, 50) + "..." : "Non disponible"}`,
      )

      // Essayer de parser les métadonnées
      let parsedMetadata
      try {
        if (typeof tokenURI === "string") {
          if (tokenURI.startsWith("{")) {
            parsedMetadata = JSON.parse(tokenURI)
            addLog(`Métadonnées parsées pour le token ${tokenId}`)
          } else if (tokenURI.startsWith("http")) {
            addLog(`URI externe pour le token ${tokenId}, impossible de récupérer les métadonnées`)
            parsedMetadata = { name: `NFT #${tokenId}`, description: "Métadonnées externes", image: "" }
          }
        }
      } catch (e) {
        addLog(`Erreur lors du parsing des métadonnées: ${e instanceof Error ? e.message : String(e)}`)
      }

      return {
        tokenId,
        tokenURI: tokenURI as string,
        isListed: false, // Sera mis à jour plus tard
        parsedMetadata,
      }
    } catch (err) {
      addLog(
        `Erreur lors de la récupération du NFT #${tokenId.toString()}: ${err instanceof Error ? err.message : String(err)}`,
      )
      return null
    }
  }

  // Fonction pour ajouter manuellement un NFT
  const handleAddManualNFT = async () => {
    if (!manualTokenId || !address || !publicClient) return

    try {
      const tokenId = BigInt(manualTokenId)
      addLog(`Tentative de récupération du NFT #${tokenId.toString()}...`)

      const nft = await fetchNFTById(tokenId)
      if (nft) {
        // Vérifier si ce NFT n'est pas déjà dans la liste
        if (!ownedNFTs.some((existingNft) => existingNft.tokenId === tokenId)) {
          setOwnedNFTs((prev) => [...prev, nft])
          addLog(`NFT #${tokenId.toString()} ajouté avec succès`)
        } else {
          addLog(`Le NFT #${tokenId.toString()} est déjà dans votre liste`)
        }
      } else {
        addLog(`Impossible d'ajouter le NFT #${tokenId.toString()}`)
      }
    } catch (err) {
      addLog(`Erreur lors de l'ajout manuel du NFT: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setManualTokenId("")
    }
  }

  // Fonction pour récupérer les NFTs en utilisant les événements Transfer
  const fetchNFTsFromTransferEvents = async () => {
    if (!address || !publicClient) {
      addLog("Adresse ou client public non disponible")
      return
    }

    try {
      addLog("Recherche des événements Transfer pour trouver vos NFTs...")

      // Récupérer les événements Transfer où l'utilisateur est le destinataire
      const transferEvents = await publicClient.getLogs({
        address: NFT_ADDRESS as `0x${string}`,
        event: {
          type: "event",
          name: "Transfer",
          inputs: [
            { indexed: true, name: "from", type: "address" },
            { indexed: true, name: "to", type: "address" },
            { indexed: true, name: "tokenId", type: "uint256" },
          ],
        },
        args: {
          to: address,
        },
        fromBlock: "earliest",
        toBlock: "latest",
      })

      addLog(`${transferEvents.length} événements Transfer trouvés où vous êtes le destinataire`)

      // Récupérer les événements Transfer où l'utilisateur est l'expéditeur
      const transferOutEvents = await publicClient.getLogs({
        address: NFT_ADDRESS as `0x${string}`,
        event: {
          type: "event",
          name: "Transfer",
          inputs: [
            { indexed: true, name: "from", type: "address" },
            { indexed: true, name: "to", type: "address" },
            { indexed: true, name: "tokenId", type: "uint256" },
          ],
        },
        args: {
          from: address,
        },
        fromBlock: "earliest",
        toBlock: "latest",
      })

      addLog(`${transferOutEvents.length} événements Transfer trouvés où vous êtes l'expéditeur`)

      // Créer un ensemble de tokenIds reçus
      const receivedTokenIds = new Set(transferEvents.map((event) => BigInt(event.args.tokenId as bigint)))

      // Créer un ensemble de tokenIds envoyés
      const sentTokenIds = new Set(transferOutEvents.map((event) => BigInt(event.args.tokenId as bigint)))

      // Déterminer les tokenIds actuellement détenus (reçus mais pas envoyés)
      const ownedTokenIds = [...receivedTokenIds].filter((id) => !sentTokenIds.has(id))

      addLog(`${ownedTokenIds.length} NFTs potentiellement détenus identifiés`)

      // Récupérer les produits du vendeur pour vérifier quels NFTs sont déjà en vente
      const listedTokenIds = new Set<string>()
      if (myProducts) {
        const products = myProducts as Product[]
        products.forEach((product) => {
          if (product.nftContract.toLowerCase() === NFT_ADDRESS.toLowerCase()) {
            listedTokenIds.add(product.tokenId.toString())
            addLog(`NFT #${product.tokenId.toString()} est déjà en vente`)
          }
        })
      }

      addLog(`${listedTokenIds.size} NFTs déjà en vente sur le marketplace`)

      // Récupérer les détails de chaque NFT
      const fetchedNFTs: OwnedNFT[] = []
      for (const tokenId of ownedTokenIds) {
        const nft = await fetchNFTById(tokenId)
        if (nft) {
          // Vérifier si ce NFT est déjà en vente
          nft.isListed = listedTokenIds.has(tokenId.toString())
          fetchedNFTs.push(nft)
        }
      }

      addLog(`${fetchedNFTs.length} NFTs récupérés avec succès`)
      setOwnedNFTs(fetchedNFTs)
    } catch (err) {
      const errorMessage = `Erreur lors de la récupération des événements Transfer: ${err instanceof Error ? err.message : String(err)}`
      addLog(errorMessage)
      setError(errorMessage)
    }
  }

  // Fonction pour récupérer les NFTs
  const fetchNFTs = async () => {
    setIsLoadingNFTs(true)
    setError("")
    addLog(`Adresse connectée: ${address}`)

    try {
      await fetchNFTsFromTransferEvents()
    } catch (err) {
      const errorMessage = `Erreur lors de la récupération des NFTs: ${err instanceof Error ? err.message : String(err)}`
      addLog(errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoadingNFTs(false)
    }
  }

  // Effet pour récupérer les NFTs au chargement
  useEffect(() => {
    if (address && publicClient) {
      addLog("Adresse et client public détectés, tentative de récupération des NFTs...")
      fetchNFTs()
    } else {
      setIsLoadingNFTs(false)
    }
  }, [address, publicClient])

  // Fonction pour tester manuellement avec un nombre fixe de NFTs
  const testWithFixedNFTs = () => {
    addLog("Test avec 6 NFTs fixes...")
    const testNFTs: OwnedNFT[] = []

    for (let i = 1; i <= 6; i++) {
      testNFTs.push({
        tokenId: BigInt(i),
        tokenURI: `{"name":"Test NFT #${i}","description":"NFT de test","image":"/placeholder.svg?height=500&width=500"}`,
        isListed: i % 3 === 0, // Tous les 3 NFTs sont déjà en vente
        parsedMetadata: {
          name: `Test NFT #${i}`,
          description: "NFT de test",
          image: "/placeholder.svg?height=500&width=500",
        },
      })
    }

    setOwnedNFTs(testNFTs)
    setIsLoadingNFTs(false)
    addLog("6 NFTs de test ajoutés avec succès")
  }

  // Effet pour mettre à jour les NFTs possédés quand les produits changent
  useEffect(() => {
    if (myProducts && ownedNFTs.length > 0) {
      // Mettre à jour le statut "isListed" des NFTs
      const listedTokenIds = new Set<string>()
      const products = myProducts as Product[]

      products.forEach((product) => {
        if (product.nftContract.toLowerCase() === NFT_ADDRESS.toLowerCase()) {
          listedTokenIds.add(product.tokenId.toString())
        }
      })

      const updatedNFTs = ownedNFTs.map((nft) => ({
        ...nft,
        isListed: listedTokenIds.has(nft.tokenId.toString()),
      }))

      setOwnedNFTs(updatedNFTs)
    }
  }, [myProducts, ownedNFTs.length])

  const { writeContract, isPending, data: hash } = useWriteContract()

  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  // Process products to parse metadata
  const [activeProducts, setActiveProducts] = useState<Product[]>([])
  const [inactiveProducts, setInactiveProducts] = useState<Product[]>([])

  useEffect(() => {
    if (myProducts) {
      const processed = (myProducts as Product[]).map((product) => {
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

      // Séparer les produits actifs et inactifs
      setActiveProducts(processed.filter((p) => p.active))
      setInactiveProducts(processed.filter((p) => !p.active))
    }
  }, [myProducts])

  // Update success state and reset form
  useEffect(() => {
    if (isSuccess && !success) {
      setSuccess(editingProduct ? "Produit mis à jour avec succès!" : "Produit ajouté avec succès!")
      resetForm()
      refetchProducts()
      fetchNFTs()
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
        image: imageUrl || editingProduct.parsedMetadata?.image || "https://via.placeholder.com/500",
      })

      // Si c'est un nouveau produit (ID = 0), créer un nouveau produit
      if (editingProduct.id === BigInt(0)) {
        addLog(`Création d'un nouveau produit pour le NFT #${editingProduct.tokenId.toString()}`)

        // Vérifier si le NFT est approuvé pour le marketplace
        const approved = await publicClient.readContract({
          address: NFT_ADDRESS as `0x${string}`,
          abi: nftABI,
          functionName: "getApproved",
          args: [editingProduct.tokenId],
        })

        if ((approved as string).toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
          addLog(
            `Le NFT #${editingProduct.tokenId.toString()} n'est pas approuvé pour le marketplace. Approbation en cours...`,
          )

          // Approuver le NFT pour le marketplace
          await writeContract({
            address: NFT_ADDRESS as `0x${string}`,
            abi: nftABI,
            functionName: "approve",
            args: [MARKETPLACE_ADDRESS as `0x${string}`, editingProduct.tokenId],
          })

          addLog(`NFT #${editingProduct.tokenId.toString()} approuvé pour le marketplace.`)

          // L'approbation est gérée par l'effet isSuccess, qui appellera addProduct
          return
        }

        // Si déjà approuvé, ajouter directement le produit
        await writeContract({
          address: MARKETPLACE_ADDRESS as `0x${string}`,
          abi: marketplaceABI,
          functionName: "addProduct",
          args: [
            NFT_ADDRESS,
            editingProduct.tokenId,
            productName,
            productDescription,
            parseEther(productPrice),
            metadata,
          ],
        })
      } else {
        // Sinon, mettre à jour un produit existant
        addLog(`Mise à jour du produit #${editingProduct.id.toString()}`)

        await writeContract({
          address: MARKETPLACE_ADDRESS as `0x${string}`,
          abi: marketplaceABI,
          functionName: "updateProduct",
          args: [editingProduct.id, productName, productDescription, parseEther(productPrice), isActive, metadata],
        })
      }
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

  // Fonction pour préparer la mise en vente d'un NFT
  const handleListNFT = async (nft: OwnedNFT) => {
    if (!address) return

    setError("")
    setSuccess("")

    try {
      // Créer un "produit temporaire" pour le formulaire
      setEditingProduct({
        id: BigInt(0), // ID temporaire pour indiquer un nouveau produit
        name: nft.parsedMetadata?.name || `NFT #${nft.tokenId.toString()}`,
        description: nft.parsedMetadata?.description || "",
        price: BigInt(0),
        seller: address as `0x${string}`,
        active: true,
        nftContract: NFT_ADDRESS as `0x${string}`,
        tokenId: nft.tokenId,
        metadata: typeof nft.tokenURI === "string" && nft.tokenURI.startsWith("{") ? nft.tokenURI : "",
        parsedMetadata: nft.parsedMetadata,
      })

      // Pré-remplir le formulaire avec les métadonnées du NFT
      setProductName(nft.parsedMetadata?.name || `NFT #${nft.tokenId.toString()}`)
      setProductDescription(nft.parsedMetadata?.description || "")
      setImageUrl(nft.parsedMetadata?.image || "")
      setProductPrice("0.1") // Prix par défaut

      // Passer à l'onglet "En vente"
      setActiveTab("listed")
    } catch (err) {
      console.error("Erreur lors de la préparation de la mise en vente:", err)
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
    }
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Store className="h-5 w-5 mr-2" />
              Mes Produits
            </CardTitle>
            <CardDescription>Gérez vos produits sur le marketplace</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-secondary/50 border-border">
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter NFT
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un NFT manuellement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Si vous connaissez l'ID d'un NFT que vous possédez, vous pouvez l'ajouter manuellement ici.
                  </p>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="ID du NFT (ex: 1)"
                      value={manualTokenId}
                      onChange={(e) => setManualTokenId(e.target.value)}
                    />
                    <Button onClick={handleAddManualNFT}>Ajouter</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={testWithFixedNFTs} className="bg-secondary/50 border-border">
              Test 6 NFTs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-secondary/50 border-border"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
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

                {editingProduct.id !== BigInt(0) && (
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
                      {isPending ? "Confirmation..." : "Transaction en cours..."}
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      {editingProduct.id === BigInt(0) ? "Mettre en vente" : "Mettre à jour"}
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="owned" className="flex items-center">
                <ShoppingBag className="h-4 w-4 mr-2" />
                <span>Mes NFTs</span>
              </TabsTrigger>
              <TabsTrigger value="listed" className="flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                <span>En vente</span>
              </TabsTrigger>
              <TabsTrigger value="sold" className="flex items-center">
                <Store className="h-4 w-4 mr-2" />
                <span>Vendus</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="owned" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Mes NFTs</h3>
              {isLoadingNFTs ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-secondary/50 p-4 rounded-lg">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : ownedNFTs && ownedNFTs.length > 0 ? (
                <div className="space-y-4">
                  {ownedNFTs.map((nft) => (
                    <div key={nft.tokenId.toString()} className="bg-secondary/50 p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {nft.parsedMetadata?.image && (
                            <div className="aspect-square w-full max-w-[120px] bg-background/50 rounded-md mb-3 overflow-hidden float-right ml-3">
                              <img
                                src={nft.parsedMetadata.image || "/placeholder.svg"}
                                alt={nft.parsedMetadata.name || `NFT #${nft.tokenId.toString()}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg?height=500&width=500"
                                }}
                              />
                            </div>
                          )}
                          <div className="flex items-center">
                            <ShoppingBag className="h-4 w-4 text-primary mr-2" />
                            <h4 className="font-medium">
                              {nft.parsedMetadata?.name || `NFT #${nft.tokenId.toString()}`}
                            </h4>
                            {nft.isListed && (
                              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-500">
                                En vente
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {nft.parsedMetadata?.description || "Aucune description"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">NFT ID: {nft.tokenId.toString()}</p>

                          {!nft.isListed && (
                            <Button
                              onClick={() => handleListNFT(nft)}
                              className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                              size="sm"
                            >
                              Mettre en vente
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Vous ne possédez pas encore de NFTs</p>
              )}
            </TabsContent>

            <TabsContent value="listed" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Produits en vente</h3>
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
              ) : activeProducts && activeProducts.length > 0 ? (
                <div className="space-y-4">
                  {activeProducts.map((product) => (
                    <div key={product.id.toString()} className="bg-secondary/50 p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {product.parsedMetadata?.image && (
                            <div className="aspect-square w-full max-w-[120px] bg-background/50 rounded-md mb-3 overflow-hidden float-right ml-3">
                              <img
                                src={product.parsedMetadata.image || "/placeholder.svg"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg?height=500&width=500"
                                }}
                              />
                            </div>
                          )}
                          <div className="flex items-center">
                            <Tag className="h-4 w-4 text-primary mr-2" />
                            <h4 className="font-medium">{product.name}</h4>
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-500">
                              Actif
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                          <p className="text-sm font-medium mt-2">{formatEther(product.price)} TEST</p>
                          <p className="text-xs text-muted-foreground mt-1">NFT ID: {product.tokenId.toString()}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setProductToEdit(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Vous n'avez pas de produits en vente</p>
              )}
            </TabsContent>

            <TabsContent value="sold" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Produits vendus</h3>
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
              ) : inactiveProducts && inactiveProducts.length > 0 ? (
                <div className="space-y-4">
                  {inactiveProducts.map((product) => (
                    <div key={product.id.toString()} className="bg-secondary/50 p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {product.parsedMetadata?.image && (
                            <div className="aspect-square w-full max-w-[120px] bg-background/50 rounded-md mb-3 overflow-hidden float-right ml-3">
                              <img
                                src={product.parsedMetadata.image || "/placeholder.svg"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg?height=500&width=500"
                                }}
                              />
                            </div>
                          )}
                          <div className="flex items-center">
                            <Tag className="h-4 w-4 text-primary mr-2" />
                            <h4 className="font-medium">{product.name}</h4>
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-destructive/20 text-destructive">
                              Vendu
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                          <p className="text-sm font-medium mt-2">{formatEther(product.price)} TEST</p>
                          <p className="text-xs text-muted-foreground mt-1">NFT ID: {product.tokenId.toString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Vous n'avez pas encore vendu de produits</p>
              )}
            </TabsContent>
          </Tabs>

          {debugLogs.length > 0 && (
            <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border">
              <h3 className="font-medium mb-2">Logs de débogage</h3>
              <div className="text-xs font-mono bg-background/70 p-2 rounded max-h-40 overflow-y-auto">
                {debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

