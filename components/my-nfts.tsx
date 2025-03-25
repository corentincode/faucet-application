"use client"

import { useState, useEffect } from "react"
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw, ShoppingBag, Plus, Tag, CheckCircle, Store } from "lucide-react"
import { nftABI } from "@/lib/nft-abi"
import { marketplaceABI } from "@/lib/marketplace-abi"
import { NFT_ADDRESS, MARKETPLACE_ADDRESS } from "@/lib/constants"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatEther } from "viem"
import { toast } from "react-toastify"

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
  const [logs, setLogs] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [manualTokenId, setManualTokenId] = useState("")
  const [activeTab, setActiveTab] = useState("available")
  const [isApproving, setIsApproving] = useState(false)
  const [approvingTokenId, setApprovingTokenId] = useState<bigint | null>(null)
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const router = useRouter()

  // Fonction pour ajouter des logs
  const addLog = (message: string) => {
    console.log(message)
    setLogs((prev) => [...prev, message])
  }

  // Récupérer les produits du vendeur pour vérifier quels NFTs sont déjà en vente
  const fetchSellerProducts = async () => {
    if (!address || !publicClient) return { active: [], inactive: [] }

    try {
      addLog("Récupération des produits du vendeur...")
      const products = await publicClient.readContract({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: marketplaceABI,
        functionName: "getProductsBySeller",
        args: [address],
      })

      const allProducts = products as Product[]
      addLog(`${allProducts.length} produits trouvés`)

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
      addLog(`Erreur lors de la récupération des produits: ${err instanceof Error ? err.message : String(err)}`)
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
        if (!availableNFTs.some((existingNft) => existingNft.tokenId === tokenId)) {
          setAvailableNFTs((prev) => [...prev, nft])
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
      const { active: activeProducts, inactive: inactiveProducts } = await fetchSellerProducts()

      // Mettre à jour les NFTs en vente et vendus
      setListedNFTs(activeProducts)
      setSoldNFTs(inactiveProducts)

      const listedTokenIds = new Set(
        activeProducts
          .filter((product) => product.nftContract.toLowerCase() === NFT_ADDRESS.toLowerCase())
          .map((product) => product.tokenId.toString()),
      )

      addLog(`${listedTokenIds.size} NFTs déjà en vente sur le marketplace`)

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
          } else {
            addLog(`NFT #${tokenId.toString()} est déjà en vente, il ne sera pas affiché dans l'onglet "Disponibles"`)
          }
        }
      }

      addLog(`${fetchedNFTs.length} NFTs non listés récupérés avec succès`)
      setAvailableNFTs(fetchedNFTs)
    } catch (err) {
      const errorMessage = `Erreur lors de la récupération des événements Transfer: ${err instanceof Error ? err.message : String(err)}`
      addLog(errorMessage)
      setError(errorMessage)
    }
  }

  // Fonction pour récupérer les NFTs
  const fetchNFTs = async () => {
    setIsLoading(true)
    setError("")
    addLog(`Adresse connectée: ${address}`)

    try {
      await fetchNFTsFromTransferEvents()
    } catch (err) {
      const errorMessage = `Erreur lors de la récupération des NFTs: ${err instanceof Error ? err.message : String(err)}`
      addLog(errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Effet pour récupérer les NFTs au chargement
  useEffect(() => {
    if (address && publicClient) {
      addLog("Adresse et client public détectés, tentative de récupération des NFTs...")
      fetchNFTs()
    } else {
      setIsLoading(false)
    }
  }, [address, publicClient])

  // Fonction pour rafraîchir manuellement
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setLogs([])
    setSuccess("")
    setError("")
    addLog("Rafraîchissement des données...")

    try {
      await fetchNFTs()
      addLog("Données rafraîchies avec succès")
    } catch (err) {
      addLog(`Erreur lors du rafraîchissement: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Fonction pour tester manuellement avec un nombre fixe de NFTs
  const testWithFixedNFTs = () => {
    addLog("Test avec des NFTs fixes...")

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
    addLog("NFTs de test ajoutés avec succès")
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
        addLog(`Le NFT #${nft.tokenId.toString()} n'est pas approuvé pour le marketplace. Approbation en cours...`)

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
        addLog(`NFT #${nft.tokenId.toString()} déjà approuvé pour le marketplace.`)

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
      const errorMessage = `Erreur lors de la préparation de la mise en vente: ${err instanceof Error ? err.message : String(err)}`
      addLog(errorMessage)
      setError(errorMessage)
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
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-secondary/50 p-4 rounded-lg">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                ))}
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
              <p className="text-center text-muted-foreground py-4">
                Vous n'avez pas de NFTs disponibles pour la mise en vente
              </p>
            )}
          </TabsContent>

          {/* Onglet NFTs en vente */}
          <TabsContent value="listed" className="mt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-secondary/50 p-4 rounded-lg">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                ))}
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
              <p className="text-center text-muted-foreground py-4">Vous n'avez pas de NFTs en vente actuellement</p>
            )}
          </TabsContent>

          {/* Onglet NFTs vendus */}
          <TabsContent value="sold" className="mt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-secondary/50 p-4 rounded-lg">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                ))}
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
              <p className="text-center text-muted-foreground py-4">Vous n'avez pas encore vendu de NFTs</p>
            )}
          </TabsContent>
        </Tabs>

        {logs.length > 0 && (
          <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border">
            <h3 className="font-medium mb-2">Logs de débogage</h3>
            <div className="text-xs font-mono bg-background/70 p-2 rounded max-h-60 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

