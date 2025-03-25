"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle, Image } from "lucide-react"
import { nftABI } from "@/lib/nft-abi"
import { NFT_ADDRESS, MARKETPLACE_ADDRESS } from "@/lib/constants"

export function CreateNFT() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [isAutoApproving, setIsAutoApproving] = useState(true)
  const [logs, setLogs] = useState<string[]>([])
  const { address, isConnected } = useAccount()

  // Fonction pour ajouter des logs
  const addLog = (message: string) => {
    console.log(message)
    setLogs((prev) => [...prev, message])
  }

  // Contrats pour créer et approuver le NFT
  const { writeContract: createNFT, isPending: isCreating, data: createTxHash } = useWriteContract()
  const { writeContract: approveNFT, isPending: isApproving, data: approveTxHash } = useWriteContract()

  // Attendre la confirmation des transactions
  const { isSuccess: isCreateSuccess, isLoading: isCreateConfirming } = useWaitForTransactionReceipt({
    hash: createTxHash,
  })

  const { isSuccess: isApproveSuccess, isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  })

  // Vérifier le propriétaire du NFT
  const { data: ownerData, refetch: refetchOwner } = useReadContract({
    address: NFT_ADDRESS as `0x${string}`,
    abi: nftABI,
    functionName: "ownerOf",
    args: tokenId ? [tokenId] : undefined,
    query: {
      enabled: !!tokenId,
    },
  })

  // Vérifier si le NFT est approuvé pour le marketplace
  const { data: approvedAddress, refetch: refetchApproval } = useReadContract({
    address: NFT_ADDRESS as `0x${string}`,
    abi: nftABI,
    functionName: "getApproved",
    args: tokenId ? [tokenId] : undefined,
    query: {
      enabled: !!tokenId,
    },
  })

  // Fonction pour créer un NFT
  const handleCreateNFT = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setTokenId(null)
    setIsApproved(false)
    setLogs([])

    if (!address) {
      setError("Veuillez connecter votre portefeuille")
      return
    }

    if (!name || !description) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      // Créer les métadonnées du NFT
      const metadata = JSON.stringify({
        name,
        description,
        image: imageUrl || "https://via.placeholder.com/500",
      })

      addLog(`Création du NFT avec les métadonnées: ${metadata}`)
      addLog(`Adresse du contrat NFT: ${NFT_ADDRESS}`)

      await createNFT({
        address: NFT_ADDRESS as `0x${string}`,
        abi: nftABI,
        functionName: "createNFT",
        args: [address, metadata],
      })
    } catch (err) {
      console.error("Erreur lors de la création du NFT:", err)
      setError(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Effet pour gérer la création réussie du NFT
  useEffect(() => {
    if (isCreateSuccess && createTxHash) {
      addLog(`NFT créé avec succès! Hash de transaction: ${createTxHash}`)

      // Dans une application réelle, vous devriez récupérer le tokenId à partir des logs de la transaction
      // Pour cet exemple, nous utilisons un ID fixe pour les tests
      const newTokenId = BigInt(1) // Remplacez par la logique pour obtenir le vrai tokenId
      setTokenId(newTokenId)
      setSuccess(`NFT créé avec succès! ID: ${newTokenId.toString()}`)

      // Vérifier le propriétaire et l'approbation
      setTimeout(() => {
        refetchOwner()
        refetchApproval()
      }, 2000)
    }
  }, [isCreateSuccess, createTxHash, refetchOwner, refetchApproval])

  // Effet pour vérifier le propriétaire
  useEffect(() => {
    if (ownerData && tokenId) {
      const owner = ownerData as `0x${string}`
      addLog(`Propriétaire du NFT #${tokenId.toString()}: ${owner}`)

      if (owner.toLowerCase() === address?.toLowerCase()) {
        addLog("Vous êtes bien le propriétaire de ce NFT")

        // Vérifier si le NFT est déjà approuvé
        if (approvedAddress) {
          const approved = approvedAddress as `0x${string}`
          if (approved.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase()) {
            addLog("Le NFT est déjà approuvé pour le marketplace")
            setIsApproved(true)
          } else if (isAutoApproving) {
            // Approuver automatiquement le NFT pour le marketplace
            handleApproveMarketplace()
          }
        } else if (isAutoApproving) {
          // Approuver automatiquement le NFT pour le marketplace
          handleApproveMarketplace()
        }
      } else {
        addLog(`Attention: Vous n'êtes pas le propriétaire de ce NFT`)
        setError(`Vous n'êtes pas le propriétaire de ce NFT. Propriétaire: ${owner}`)
      }
    }
  }, [ownerData, approvedAddress, address, tokenId, isAutoApproving])

  // Fonction pour approuver le Marketplace à transférer le NFT
  const handleApproveMarketplace = async () => {
    if (!tokenId || !address) return

    setError("")
    addLog(`Approbation du Marketplace pour le NFT: ${tokenId.toString()}`)
    addLog(`Adresse du Marketplace: ${MARKETPLACE_ADDRESS}`)

    try {
      await approveNFT({
        address: NFT_ADDRESS as `0x${string}`,
        abi: nftABI,
        functionName: "approve",
        args: [MARKETPLACE_ADDRESS as `0x${string}`, tokenId],
      })
    } catch (err) {
      console.error("Erreur lors de l'approbation:", err)
      setError(`Erreur d'approbation: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Effet pour gérer l'approbation réussie
  useEffect(() => {
    if (isApproveSuccess && tokenId) {
      addLog(`NFT #${tokenId.toString()} approuvé avec succès pour le marketplace!`)
      setIsApproved(true)
      setSuccess(`NFT approuvé pour le Marketplace! Vous pouvez maintenant le mettre en vente.`)

      // Vérifier l'approbation
      setTimeout(() => {
        refetchApproval()
      }, 2000)
    }
  }, [isApproveSuccess, tokenId, refetchApproval])

  // Effet pour vérifier l'approbation
  useEffect(() => {
    if (approvedAddress && tokenId) {
      const approved = approvedAddress as `0x${string}`
      addLog(`Adresse approuvée pour le NFT #${tokenId.toString()}: ${approved}`)

      if (approved.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase()) {
        addLog("Le NFT est bien approuvé pour le marketplace")
        setIsApproved(true)
      } else {
        addLog("Le NFT n'est pas approuvé pour le marketplace")
        setIsApproved(false)
      }
    }
  }, [approvedAddress, tokenId])

  return (
    <Card className="backdrop-blur-sm bg-secondary/30 border-border overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Image className="h-5 w-5 mr-2" />
          Créer un NFT
        </CardTitle>
        <CardDescription>Créez votre propre NFT avant de le mettre en vente sur le marketplace</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateNFT} className="space-y-4">
          <div>
            <Input
              placeholder="Nom du NFT"
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
              placeholder="URL de l'image (optionnel)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="bg-background/50"
            />
          </div>

          <Button
            type="submit"
            disabled={!isConnected || isCreating || isCreateConfirming || isApproving || isApproveConfirming}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
          >
            {isCreating || isCreateConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isCreating ? "Création..." : "Transaction en cours..."}
              </>
            ) : (
              <>
                <Image className="h-4 w-4 mr-2" />
                Créer le NFT
              </>
            )}
          </Button>

          {tokenId && !isApproved && (
            <Button
              type="button"
              onClick={handleApproveMarketplace}
              disabled={isApproving || isApproveConfirming}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground w-full mt-2"
            >
              {isApproving || isApproveConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isApproving ? "Approbation..." : "Transaction en cours..."}
                </>
              ) : (
                "Approuver pour le Marketplace"
              )}
            </Button>
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

          {tokenId && (
            <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border">
              <h3 className="font-medium mb-2">NFT créé avec succès</h3>
              <p className="text-sm text-muted-foreground">ID du token: {tokenId.toString()}</p>
              <p className="text-sm text-muted-foreground">
                Adresse du contrat: {NFT_ADDRESS.substring(0, 6)}...{NFT_ADDRESS.substring(38)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Statut:{" "}
                {isApproved ? (
                  <span className="text-green-500">Approuvé pour le Marketplace</span>
                ) : (
                  <span className="text-yellow-500">En attente d'approbation</span>
                )}
              </p>
              <p className="text-sm mt-4">
                Vous pouvez maintenant{" "}
                {isApproved ? "mettre ce NFT en vente" : "approuver ce NFT pour le mettre en vente"}.
              </p>
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border">
              <h3 className="font-medium mb-2">Logs</h3>
              <div className="text-xs font-mono bg-background/70 p-2 rounded max-h-40 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

