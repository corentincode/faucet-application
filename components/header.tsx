"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useAccount, useDisconnect, useEnsName } from "wagmi"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Home, Store, ShoppingBag, Tag, ImageIcon, ChevronDown, LogOut, Copy, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const routes = [
  {
    name: "Accueil",
    path: "/",
    icon: <Home className="h-5 w-5" />,
  },
  {
    name: "Marketplace",
    path: "/marketplace",
    icon: <Store className="h-5 w-5" />,
  },
  {
    name: "Mes NFTs",
    path: "/my-nfts",
    icon: <ShoppingBag className="h-5 w-5" />,
  },
  {
    name: "Mettre en vente",
    path: "/add-product",
    icon: <Tag className="h-5 w-5" />,
  },
  {
    name: "Créer un NFT",
    path: "/create-nft",
    icon: <ImageIcon className="h-5 w-5" />,
  },
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { data: ensName } = useEnsName({ address })
  const { disconnect } = useDisconnect()

  // Éviter les erreurs d'hydratation
  useEffect(() => {
    setMounted(true)
  }, [])

  // Détecter le défilement pour changer l'apparence du header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Copier l'adresse dans le presse-papier
  const copyAddressToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast.success("Adresse copiée dans le presse-papier", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    }
  }

  // Ouvrir l'adresse sur Etherscan
  const openOnEtherscan = () => {
    if (address) {
      window.open(`https://sepolia.etherscan.io/address/${address}`, "_blank")
    }
  }

  // Déconnecter et rediriger vers la page d'accueil
  const handleDisconnect = () => {
    disconnect()
    router.push("/")
  }

  if (!mounted) return null

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled ? "bg-background/80 backdrop-blur-lg border-b border-border/40 shadow-sm" : "bg-background",
        )}
      >
        <div className="container mx-auto">
          <div className="flex h-16 items-center justify-between">
            {/* Logo à gauche */}
            <div className="flex items-center">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden mr-2">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <div className="p-6 bg-primary/5 border-b border-border">
                    <Link href="/" className="flex items-center gap-2 font-bold" onClick={() => setIsOpen(false)}>
                      <Image src="/logo.png" alt="Logo" width={60} height={60} />
                    </Link>
                  </div>
                  <nav className="flex flex-col p-4">
                    {routes.map((route) => (
                      <Link
                        key={route.path}
                        href={route.path}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-base font-medium rounded-md hover:bg-primary/5 transition-colors",
                          pathname === route.path ? "bg-primary/10 text-primary" : "text-foreground/70",
                        )}
                      >
                        {route.icon}
                        {route.name}
                      </Link>
                    ))}
                  </nav>

                  {isConnected && address && (
                    <div className="p-4 mt-4 border-t border-border">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {address.substring(2, 4).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {ensName || `${address.substring(0, 6)}...${address.substring(38)}`}
                          </span>
                          <span className="text-xs text-muted-foreground">Connecté</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        className="w-full mt-2 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          handleDisconnect()
                          setIsOpen(false)
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Déconnecter
                      </Button>
                    </div>
                  )}
                </SheetContent>
              </Sheet>

              <Link href="/" className="flex items-center">
                <Image src="/logo.png" alt="Logo" width={48} height={48} className="h-12 w-auto" />
              </Link>
            </div>

            {/* Navigation au centre */}
            <div className="hidden md:flex flex-1 justify-center">
              <nav className="flex items-center gap-1">
                {routes.map((route) => {
                  const isActive = pathname === route.path

                  return (
                    <Link
                      key={route.path}
                      href={route.path}
                      className={cn(
                        "relative px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive ? "text-primary" : "text-foreground/70 hover:text-foreground hover:bg-primary/5",
                      )}
                    >
                      {route.name}
                      {isActive && (
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                          layoutId="activeRoute"
                          transition={{ type: "spring", duration: 0.5 }}
                        />
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Profil à droite */}
            <div className="flex items-center gap-4">
              {isConnected && address ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2">
                      <Avatar className="h-5 w-5 mr-1">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {address.substring(2, 4).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-mono text-sm">
                        {ensName || `${address.substring(0, 6)}...${address.substring(38)}`}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={copyAddressToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier l'adresse
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={openOnEtherscan}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Voir sur Etherscan
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDisconnect} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Déconnecter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-sm text-muted-foreground hidden md:block">Non connecté</span>
              )}

              {/* Version mobile du bouton de profil */}
              {isConnected && address && (
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {address.substring(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Conteneur de notifications toast */}
      <ToastContainer position="bottom-right" />
    </>
  )
}

