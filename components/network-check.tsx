"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAccount, useChainId, useSwitchChain } from "wagmi"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Définir l'ID de chaîne Polygon Amoy
const POLYGON_AMOY_CHAIN_ID = 80002

// Définir les paramètres du réseau Polygon Amoy pour l'ajout au portefeuille
const POLYGON_AMOY_PARAMS = {
  chainId: `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}`,
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpcUrls: ["https://rpc-amoy.polygon.technology"],
  blockExplorerUrls: ["https://amoy.polygonscan.com"],
}

export function NetworkCheck({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitchPending } = useSwitchChain()
  const [isWrongNetwork, setIsWrongNetwork] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [ethereumChainId, setEthereumChainId] = useState<number | null>(null)

  // Récupérer l'ID de chaîne directement depuis window.ethereum
  useEffect(() => {
    async function getEthereumChainId() {
      if (window.ethereum && typeof window.ethereum.request === "function") {
        try {
          const chainIdHex = await window.ethereum.request({ method: "eth_chainId" })
          const chainIdDecimal = Number.parseInt(chainIdHex, 16)
          setEthereumChainId(chainIdDecimal)
        } catch (error) {
          console.error("Erreur lors de la récupération de l'ID de chaîne:", error)
        }
      }
    }

    if (isConnected) {
      getEthereumChainId()
    }

    // Ajouter un écouteur pour les changements de chaîne
    if (window.ethereum) {
      const handleChainChanged = (chainId: string) => {
        const chainIdDecimal = Number.parseInt(chainId, 16)
        setEthereumChainId(chainIdDecimal)
        // Vérifier si le réseau est correct
        setIsWrongNetwork(chainIdDecimal !== POLYGON_AMOY_CHAIN_ID)
      }

      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [isConnected])

  // Vérifier si l'utilisateur est sur le bon réseau
  // Utiliser à la fois chainId de wagmi et ethereumChainId pour plus de fiabilité
  useEffect(() => {
    if (isConnected) {
      // Utiliser ethereumChainId s'il est disponible, sinon utiliser chainId de wagmi
      const effectiveChainId = ethereumChainId !== null ? ethereumChainId : chainId
      const wrongNetwork = effectiveChainId !== POLYGON_AMOY_CHAIN_ID

      setIsWrongNetwork(wrongNetwork)

      // Ouvrir la boîte de dialogue si l'utilisateur est sur le mauvais réseau
      if (wrongNetwork) {
        setIsDialogOpen(true)
      } else {
        setIsDialogOpen(false)
      }
    }
  }, [isConnected, chainId, ethereumChainId])

  // Fonction pour changer de réseau avec wagmi
  const handleSwitchNetwork = async () => {
    try {
      setSwitchError(null)
      await switchChain({ chainId: POLYGON_AMOY_CHAIN_ID })
    } catch (error) {
      console.error("Erreur lors du changement de réseau avec switchChain:", error)

      // Essayer d'ajouter le réseau si le changement échoue
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [POLYGON_AMOY_PARAMS],
          })
        } catch (addError) {
          console.error("Erreur lors de l'ajout du réseau:", addError)
          setSwitchError(
            "Impossible de changer ou d'ajouter automatiquement le réseau. Veuillez l'ajouter manuellement dans votre portefeuille.",
          )
        }
      }
    }
  }

  // Si l'utilisateur n'est pas connecté ou est sur le bon réseau, afficher les enfants normalement
  if (!isConnected || !isWrongNetwork) {
    return <>{children}</>
  }

  // Si l'utilisateur est sur le mauvais réseau, afficher une alerte et bloquer l'interface
  return (
    <>
      <Alert variant="destructive" className="mb-4 p-4 border-2 border-destructive shadow-lg">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="ml-3 w-full">
            <AlertTitle className="text-lg font-bold mb-2">Mauvais réseau détecté</AlertTitle>
            <AlertDescription className="text-base">
              <p className="mb-3">Veuillez passer au réseau Polygon Amoy pour utiliser cette application.</p>
              <Button
                onClick={handleSwitchNetwork}
                disabled={isSwitchPending}
                className="bg-white text-destructive hover:bg-white/90 border border-destructive"
              >
                {isSwitchPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Changer de réseau
              </Button>
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <div className="opacity-50 pointer-events-none">{children}</div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Mauvais réseau détecté
            </DialogTitle>
            <DialogDescription>
              Cette application fonctionne uniquement sur le réseau Polygon Amoy testnet. Vous êtes actuellement
              connecté à un autre réseau.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-secondary/30 p-4 rounded-lg border border-border">
              <p className="text-sm text-destructive font-medium">
                Attention : Effectuer des transactions sur le mauvais réseau peut entraîner une perte de fonds réels.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Changer de réseau</h3>
                <Button onClick={handleSwitchNetwork} disabled={isSwitchPending} className="w-full">
                  {isSwitchPending ? (
                    <span className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Changement...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Changer de réseau
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Paramètres du réseau</h3>
                <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-3">
                  <h4 className="text-sm font-medium">Paramètres du réseau Polygon Amoy:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="font-medium">Nom du réseau:</div>
                    <div>Polygon Amoy Testnet</div>

                    <div className="font-medium">URL RPC:</div>
                    <div className="break-all">https://rpc-amoy.polygon.technology</div>

                    <div className="font-medium">ID de chaîne:</div>
                    <div>80002</div>

                    <div className="font-medium">Symbole:</div>
                    <div>MATIC</div>

                    <div className="font-medium">Explorateur de blocs:</div>
                    <div className="break-all">https://amoy.polygonscan.com</div>
                  </div>
                </div>
              </div>
            </div>

            {switchError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{switchError}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

