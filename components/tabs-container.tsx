"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FaucetForm } from "./faucet-form"
import { Marketplace } from "./marketplace"
import { MyProducts } from "./my-products"
import { Droplets, Store, Package } from "lucide-react"

export function TabsContainer() {
  const [activeTab, setActiveTab] = useState("faucet")

  return (
    <Tabs defaultValue="faucet" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-6">
        <TabsTrigger value="faucet" className="flex items-center">
          <Droplets className="h-4 w-4 mr-2" />
          Faucet
        </TabsTrigger>
        <TabsTrigger value="marketplace" className="flex items-center">
          <Store className="h-4 w-4 mr-2" />
          Marketplace
        </TabsTrigger>
        <TabsTrigger value="my-products" className="flex items-center">
          <Package className="h-4 w-4 mr-2" />
          Mes Produits
        </TabsTrigger>
      </TabsList>
      <TabsContent value="faucet">
        <FaucetForm />
      </TabsContent>
      <TabsContent value="marketplace">
        <Marketplace />
      </TabsContent>
      <TabsContent value="my-products">
        <MyProducts />
      </TabsContent>
    </Tabs>
  )
}

