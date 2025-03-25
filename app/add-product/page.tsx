import { Suspense } from "react"
import { AddProduct } from "@/components/add-product"
import { Skeleton } from "@/components/ui/skeleton"

export default function AddProductPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Mettre en vente un NFT</h1>
      <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
        <AddProduct />
      </Suspense>
    </div>
  )
}

