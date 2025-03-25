"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Home, Store, ShoppingBag, Tag, Image, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

const routes = [
  {
    name: "Accueil",
    path: "/",
    icon: <Home className="h-5 w-5 mr-2" />,
  },
  {
    name: "Marketplace",
    path: "/marketplace",
    icon: <Store className="h-5 w-5 mr-2" />,
  },
  {
    name: "Mes NFTs",
    path: "/my-nfts",
    icon: <ShoppingBag className="h-5 w-5 mr-2" />,
  },
  {
    name: "Mettre en vente",
    path: "/add-product",
    icon: <Tag className="h-5 w-5 mr-2" />,
  },
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { address, isConnected } = useAccount()

  // Éviter les erreurs d'hydratation
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
              <div className="px-7">
                <Link href="/" className="flex items-center gap-2 font-bold" onClick={() => setIsOpen(false)}>
                  <Store className="h-6 w-6" />
                  <span className="font-bold">NFT Marketplace</span>
                </Link>
              </div>
              <nav className="flex flex-col gap-4 px-2 pt-8">
                {routes.map((route) => (
                  <Link
                    key={route.path}
                    href={route.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent",
                      pathname === route.path ? "bg-accent text-accent-foreground" : "text-foreground/60",
                    )}
                  >
                    {route.icon}
                    {route.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/" className="hidden md:flex items-center gap-2 font-bold">
            <Store className="h-6 w-6" />
            <span>NFT Marketplace</span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {routes.map((route) => (
              <Link
                key={route.path}
                href={route.path}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent",
                  pathname === route.path ? "bg-accent text-accent-foreground" : "text-foreground/60",
                )}
              >
                {route.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center text-sm">
            {isConnected && address ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="font-mono">
                  {address.substring(0, 6)}...{address.substring(38)}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">Non connecté</span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

