import { useReadContract } from "wagmi"
import { TOKEN_ADDRESS } from "./constants"

// Fonction pour vérifier si une adresse est le propriétaire du contrat
export function useIsContractOwner(address: `0x${string}` | undefined) {
  const { data: owner, isLoading } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: [
      {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "owner",
  })

  return {
    isOwner: address && owner ? address.toLowerCase() === owner.toLowerCase() : false,
    isLoading,
  }
}