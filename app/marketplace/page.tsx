"use client"

import { useState } from "react"
import { ConnectButton } from "@/components/connect-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateNFT } from "@/components/create-nft"
import { AddProduct } from "@/components/add-product"
import { Marketplace } from "@/components/marketplace"
import { MyProducts } from "@/components/my-products"
import { motion } from "framer-motion"
import { Store, PlusCircle, Tag, User } from "lucide-react"

export default function MarketplacePage() {
  const [isConnected, setIsConnected] = useState(false)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-b from-background to-background/80 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 300 + 50}px`,
                height: `${Math.random() * 300 + 50}px`,
                background: `radial-gradient(circle, rgba(142, 81, 255, 0.15) 0%, rgba(0, 0, 0, 0) 70%)`,
                transform: `scale(${Math.random() * 0.5 + 0.5})`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full backdrop-blur-sm bg-card/90 rounded-2xl shadow-2xl overflow-hidden border border-border relative"
          style={{
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Card glow effect */}
          <div
            className="absolute -inset-[100px] opacity-30"
            style={{
              background: "radial-gradient(circle, rgba(142, 81, 255, 0.2) 0%, rgba(0, 0, 0, 0) 70%)",
              transform: "rotate(0deg)",
              zIndex: 0,
            }}
          />

          <div className="p-8 space-y-8 relative z-10">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <Store className="h-8 w-8 text-primary mr-2" />
              </div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                NFT Marketplace
              </h1>
              <p className="text-muted-foreground mt-2">Créez, vendez et achetez des NFTs uniques</p>
            </div>

            <ConnectButton onConnectionChange={setIsConnected} />

            {isConnected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Tabs defaultValue="browse" className="w-full">
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="browse" className="flex items-center">
                      <Store className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Explorer</span>
                    </TabsTrigger>
                    <TabsTrigger value="create" className="flex items-center">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Créer</span>
                    </TabsTrigger>
                    <TabsTrigger value="sell" className="flex items-center">
                      <Tag className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Vendre</span>
                    </TabsTrigger>
                    <TabsTrigger value="myproducts" className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Mes produits</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="browse" className="mt-0">
                    <Marketplace />
                  </TabsContent>

                  <TabsContent value="create" className="mt-0">
                    <CreateNFT />
                  </TabsContent>

                  <TabsContent value="sell" className="mt-0">
                    <AddProduct />
                  </TabsContent>

                  <TabsContent value="myproducts" className="mt-0">
                    <MyProducts />
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </div>
        </motion.div>

        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 NFT Marketplace. All rights reserved.</p>
        </footer>
      </div>
    </main>
  )
}

