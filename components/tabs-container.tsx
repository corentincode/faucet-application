"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FaucetForm } from "./faucet-form"
import { Droplets, Store, Package } from "lucide-react"

export function TabsContainer() {
  const [activeTab, setActiveTab] = useState("faucet")

  return (
    <Tabs defaultValue="faucet" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-1 mb-6">
        <TabsTrigger value="faucet" className="flex items-center">
          <Droplets className="h-4 w-4 mr-2" />
          Faucet
        </TabsTrigger>
      </TabsList>
      <TabsContent value="faucet">
        <FaucetForm />
      </TabsContent>
    </Tabs>
  )
}

