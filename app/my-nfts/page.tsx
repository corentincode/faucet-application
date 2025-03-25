import { MyNFTs } from "@/components/my-nfts"

export default function MyNFTsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Mes NFTs</h1>
      <MyNFTs />
    </div>
  )
}

