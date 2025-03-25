"use client"

import { useState, useEffect } from "react"
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, RefreshCw, ShoppingBag, Plus, Tag, CheckCircle, Store, Loader2 } from "lucide-react"
import { nftABI } from "@/lib/nft-abi"
import { marketplaceABI } from "@/lib/marketplace-abi"
import { NFT_ADDRESS, MARKETPLACE_ADDRESS } from "@/lib/constants"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatEther } from "viem"
import { toast } from "react-toastify"
import { motion } from "framer-motion"

interface NFT {
  tokenId: bigint
  tokenURI: string
  isListed: boolean
  parsedMetadata?: {
    name: string
    description: string
    image: string
  }
}

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

export function MyNFTs() {
  const [availableNFTs, setAvailableNFTs] = useState<NFT[]>([])
  const [listedNFTs, setListedNFTs] = useState<Product[]>([])
  const [soldNFTs, setSoldNFTs] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [manualTokenId, setManualTokenId] = useState("")
  const [activeTab, setActiveTab] = useState("available")
  const [isApproving, setIsApproving] = useState(false)
  const [approvingTokenId, setApprovingTokenId] = useState<bigint | null>(null)
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const router = useRouter()

  // Récupérer les produits du vendeur pour vérifier quels NFTs sont déjà en vente
  const fetchSellerProducts = async () => {
    if (!address || !publicClient) return { active: [], inactive: [] }

    try {
      const products = await publicClient.readContract({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: marketplaceABI,
        functionName: "getProductsBySeller",
        args: [address],
      })

      const allProducts = products as Product[]

      // Traiter les métadonnées des produits
      const processedProducts = allProducts.map((product) => {
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
      const activeProducts = processedProducts.filter((p) => p.active)
      const inactiveProducts = processedProducts.filter((p) => !p.active)

      return { active: activeProducts, inactive: inactiveProducts }
    } catch (err) {
      console.error("Erreur lors de la récupération des produits:", err)
      return { active: [], inactive: [] }
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
        return null
      }

      // Récupérer l'URI du token
      const tokenURI = await publicClient.readContract({
        address: NFT_ADDRESS as `0x${string}`,
        abi: nftABI,
        functionName: "tokenURI",
        args: [tokenId],
      })

      // Essayer de parser les métadonnées
      let parsedMetadata
      try {
        if (typeof tokenURI === "string") {
          if (tokenURI.startsWith("{")) {
            parsedMetadata = JSON.parse(tokenURI)
          } else if (tokenURI.startsWith("http")) {
            parsedMetadata = { name: `NFT #${tokenId}`, description: "Métadonnées externes", image: "" }
          }
        }
      } catch (e) {
        console.error("Erreur lors du parsing des métadonnées:", e)
      }

      return {
        tokenId,
        tokenURI: tokenURI as string,
        isListed: false, // Sera mis à jour plus tard
        parsedMetadata,
      }
    } catch (err) {
      console.error(`Erreur lors de la récupération du NFT #${tokenId.toString()}:`, err)
      return null
    }
  }

  // Fonction pour ajouter manuellement un NFT
  const handleAddManualNFT = async () => {
    if (!manualTokenId || !address || !publicClient) return

    try {
      const tokenId = BigInt(manualTokenId)

      const nft = await fetchNFTById(tokenId)
      if (nft) {
        // Vérifier si ce NFT n'est pas déjà dans la liste
        if (!availableNFTs.some((existingNft) => existingNft.tokenId === tokenId)) {
          setAvailableNFTs((prev) => [...prev, nft])
          toast.success(`NFT #${tokenId.toString()} ajouté avec succès`)
        } else {
          toast.info(`Le NFT #${tokenId.toString()} est déjà dans votre liste`)
        }
      } else {
        toast.error(`Impossible d'ajouter le NFT #${tokenId.toString()}`)
      }
    } catch (err) {
      console.error("Erreur lors de l'ajout manuel du NFT:", err)
      toast.error("Erreur lors de l'ajout du NFT")
    } finally {
      setManualTokenId("")
    }
  }

  // Fonction pour récupérer les NFTs en utilisant les événements Transfer
  const fetchNFTsFromTransferEvents = async () => {
    if (!address || !publicClient) {
      return
    }

    try {
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

      // Créer un ensemble de tokenIds reçus
      const receivedTokenIds = new Set(transferEvents.map((event) => BigInt(event.args.tokenId as bigint)))

      // Créer un ensemble de tokenIds envoyés
      const sentTokenIds = new Set(transferOutEvents.map((event) => BigInt(event.args.tokenId as bigint)))

      // Déterminer les tokenIds actuellement détenus (reçus mais pas envoyés)
      const ownedTokenIds = [...receivedTokenIds].filter((id) => !sentTokenIds.has(id))

      // Récupérer les produits du vendeur pour vérifier quels NFTs sont déjà en vente
      const { active: activeProducts, inactive: inactiveProducts } = await fetchSellerProducts()

      // Mettre à jour les NFTs en vente et vendus
      setListedNFTs(activeProducts)
      setSoldNFTs(inactiveProducts)

      const listedTokenIds = new Set(
        activeProducts
          .filter((product) => product.nftContract.toLowerCase() === NFT_ADDRESS.toLowerCase())
          .map((product) => product.tokenId.toString()),
      )

      // Récupérer les détails de chaque NFT
      const fetchedNFTs: NFT[] = []
      for (const tokenId of ownedTokenIds) {
        const nft = await fetchNFTById(tokenId)
        if (nft) {
          // Vérifier si ce NFT est déjà en vente
          nft.isListed = listedTokenIds.has(tokenId.toString())

          // N'ajouter que les NFTs qui ne sont pas en vente
          if (!nft.isListed) {
            fetchedNFTs.push(nft)
          }
        }
      }

      setAvailableNFTs(fetchedNFTs)
    } catch (err) {
      console.error("Erreur lors de la récupération des événements Transfer:", err)
      setError("Erreur lors de la récupération de vos NFTs")
    }
  }

  // Fonction pour récupérer les NFTs
  const fetchNFTs = async () => {
    setIsLoading(true)
    setError("")

    try {
      await fetchNFTsFromTransferEvents()
    } catch (err) {
      console.error("Erreur lors de la récupération des NFTs:", err)
      setError("Erreur lors de la récupération de vos NFTs")
    } finally {
      setIsLoading(false)
    }
  }

  // Effet pour récupérer les NFTs au chargement
  useEffect(() => {
    if (address && publicClient) {
      fetchNFTs()
    } else {
      setIsLoading(false)
    }
  }, [address, publicClient])

  // Fonction pour rafraîchir manuellement
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setSuccess("")
    setError("")

    try {
      await fetchNFTs()
      toast.success("Données rafraîchies avec succès")
    } catch (err) {
      console.error("Erreur lors du rafraîchissement:", err)
      toast.error("Erreur lors du rafraîchissement des données")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Fonction pour tester manuellement avec un nombre fixe de NFTs
  const testWithFixedNFTs = () => {
    // NFTs disponibles
    const testAvailableNFTs: NFT[] = []
    for (let i = 1; i <= 3; i++) {
      testAvailableNFTs.push({
        tokenId: BigInt(i),
        tokenURI: `{"name":"NFT Disponible #${i}","description":"NFT de test disponible","image":"/placeholder.svg?height=500&width=500"}`,
        isListed: false,
        parsedMetadata: {
          name: `NFT Disponible #${i}`,
          description: "NFT de test disponible",
          image: "/placeholder.svg?height=500&width=500",
        },
      })
    }

    // NFTs en vente
    const testListedNFTs: Product[] = []
    for (let i = 4; i <= 6; i++) {
      testListedNFTs.push({
        id: BigInt(i),
        name: `NFT En Vente #${i}`,
        description: "NFT de test en vente",
        price: BigInt(i * 1000000000000000000),
        seller: address as `0x${string}`,
        active: true,
        nftContract: NFT_ADDRESS as `0x${string}`,
        tokenId: BigInt(i + 10),
        metadata: `{"name":"NFT En Vente #${i}","description":"NFT de test en vente","image":"/placeholder.svg?height=500&width=500"}`,
        parsedMetadata: {
          name: `NFT En Vente #${i}`,
          description: "NFT de test en vente",
          image: "/placeholder.svg?height=500&width=500",
        },
      })
    }

    // NFTs vendus
    const testSoldNFTs: Product[] = []
    for (let i = 7; i <= 9; i++) {
      testSoldNFTs.push({
        id: BigInt(i),
        name: `NFT Vendu #${i}`,
        description: "NFT de test vendu",
        price: BigInt(i * 1000000000000000000),
        seller: address as `0x${string}`,
        active: false,
        nftContract: NFT_ADDRESS as `0x${string}`,
        tokenId: BigInt(i + 20),
        metadata: `{"name":"NFT Vendu #${i}","description":"NFT de test vendu","image":"/placeholder.svg?height=500&width=500"}`,
        parsedMetadata: {
          name: `NFT Vendu #${i}`,
          description: "NFT de test vendu",
          image: "/placeholder.svg?height=500&width=500",
        },
      })
    }

    setAvailableNFTs(testAvailableNFTs)
    setListedNFTs(testListedNFTs)
    setSoldNFTs(testSoldNFTs)
    setIsLoading(false)
    toast.success("NFTs de test ajoutés avec succès")
  }

  // Hooks pour les transactions
  const { writeContract, isPending, data: txHash } = useWriteContract()
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Effet pour gérer le succès de l'approbation
  useEffect(() => {
    if (isSuccess && approvingTokenId) {
      toast.success(`NFT #${approvingTokenId.toString()} approuvé pour le marketplace!`)
      setSuccess(`NFT #${approvingTokenId.toString()} approuvé pour le marketplace!`)

      // Rediriger vers la page de mise en vente avec les paramètres du NFT
      const nft = availableNFTs.find((n) => n.tokenId === approvingTokenId)
      if (nft) {
        const params = new URLSearchParams({
          tokenId: nft.tokenId.toString(),
          name: nft.parsedMetadata?.name || `NFT #${nft.tokenId.toString()}`,
          description: nft.parsedMetadata?.description || "",
          image: nft.parsedMetadata?.image || "",
        })

        router.push(`/add-product?${params.toString()}`)
      }

      setApprovingTokenId(null)
      setIsApproving(false)
    }
  }, [isSuccess, approvingTokenId, availableNFTs, router])

  // Fonction pour préparer la mise en vente d'un NFT
  const handleListNFT = async (nft: NFT) => {
    if (!address) return

    setError("")
    setSuccess("")

    try {
      // Vérifier si le NFT est approuvé pour le marketplace
      const approved = await publicClient.readContract({
        address: NFT_ADDRESS as `0x${string}`,
        abi: nftABI,
        functionName: "getApproved",
        args: [nft.tokenId],
      })

      if ((approved as string).toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
        // Marquer comme en cours d'approbation
        setIsApproving(true)
        setApprovingTokenId(nft.tokenId)

        // Approuver le NFT pour le marketplace
        await writeContract({
          address: NFT_ADDRESS as `0x${string}`,
          abi: nftABI,
          functionName: "approve",
          args: [MARKETPLACE_ADDRESS as `0x${string}`, nft.tokenId],
        })

        // La redirection sera gérée dans l'effet useEffect après le succès de la transaction
      } else {
        // Si déjà approuvé, rediriger directement vers la page de mise en vente
        // Rediriger vers la page de mise en vente avec les paramètres du NFT
        const params = new URLSearchParams({
          tokenId: nft.tokenId.toString(),
          name: nft.parsedMetadata?.name || `NFT #${nft.tokenId.toString()}`,
          description: nft.parsedMetadata?.description || "",
          image: nft.parsedMetadata?.image || "",
        })

        router.push(`/add-product?${params.toString()}`)
      }
    } catch (err) {
      console.error("Erreur lors de la préparation de la mise en vente:", err)
      setError("Erreur lors de la préparation de la mise en vente")
      setIsApproving(false)
      setApprovingTokenId(null)
    }
  }

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Connectez votre portefeuille pour voir vos NFTs</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="backdrop-blur-sm bg-secondary/30 border-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center">
              <ShoppingBag className="h-5 w-5 mr-2" />
              Mes NFTs
            </CardTitle>
            <CardDescription>Gérez tous vos NFTs</CardDescription>
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
              Test NFTs
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
        <CardContent className="space-y-4">
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="available" className="flex items-center">
                <ShoppingBag className="h-4 w-4 mr-2" />
                <span>Disponibles</span>
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

            {/* Onglet NFTs disponibles */}
            <TabsContent value="available" className="mt-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Chargement de vos NFTs...</p>
                </div>
              ) : availableNFTs.length > 0 ? (
                <div className="space-y-4">
                  {availableNFTs.map((nft) => (
                    <div key={nft.tokenId.toString()} className="bg-secondary/50 p-4 rounded-lg border border-border">
                      <div className="flex items-start">
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
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {nft.parsedMetadata?.description || "Aucune description"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">NFT ID: {nft.tokenId.toString()}</p>

                          <Button
                            onClick={() => handleListNFT(nft)}
                            className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                            size="sm"
                            disabled={isPending || isConfirming || (isApproving && approvingTokenId === nft.tokenId)}
                          >
                            {isPending || isConfirming || (isApproving && approvingTokenId === nft.tokenId) ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                Approbation...
                              </>
                            ) : (
                              <>
                                <Tag className="h-4 w-4 mr-1" />
                                Mettre en vente
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-secondary/20 rounded-lg border border-border/40">
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Aucun NFT disponible</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Vous n'avez pas de NFTs disponibles pour la mise en vente. Créez un nouveau NFT ou ajoutez-en un
                    manuellement.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Onglet NFTs en vente */}
            <TabsContent value="listed" className="mt-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Chargement de vos NFTs en vente...</p>
                </div>
              ) : listedNFTs.length > 0 ? (
                <div className="space-y-4">
                  {listedNFTs.map((product) => (
                    <div key={product.id.toString()} className="bg-secondary/50 p-4 rounded-lg border border-border">
                      <div className="flex items-start">
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
                              En vente
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                          <p className="text-sm font-medium mt-1">{formatEther(product.price)} TEST</p>
                          <p className="text-xs text-muted-foreground mt-1">NFT ID: {product.tokenId.toString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-secondary/20 rounded-lg border border-border/40">
                  <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Aucun NFT en vente</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Vous n'avez pas de NFTs en vente actuellement. Mettez vos NFTs disponibles en vente sur le
                    marketplace.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Onglet NFTs vendus */}
            <TabsContent value="sold" className="mt-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Chargement de vos NFTs vendus...</p>
                </div>
              ) : soldNFTs.length > 0 ? (
                <div className="space-y-4">
                  {soldNFTs.map((product) => (
                    <div key={product.id.toString()} className="bg-secondary/50 p-4 rounded-lg border border-border">
                      <div className="flex items-start">
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
                            <Store className="h-4 w-4 text-primary mr-2" />
                            <h4 className="font-medium">{product.name}</h4>
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-destructive/20 text-destructive">
                              Vendu
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                          <p className="text-sm font-medium mt-1">{formatEther(product.price)} TEST</p>
                          <p className="text-xs text-muted-foreground mt-1">NFT ID: {product.tokenId.toString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-secondary/20 rounded-lg border border-border/40">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Aucun NFT vendu</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Vous n'avez pas encore vendu de NFTs. Les NFTs que vous vendez apparaîtront ici.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}

