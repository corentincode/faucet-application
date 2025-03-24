interface Window {
    ethereum?: {
      isMetaMask?: boolean
      isRabby?: boolean
      isCoinbaseWallet?: boolean
      isWalletConnect?: boolean
      isTrust?: boolean
      request: (request: { method: string; params?: any[] }) => Promise<any>
    }
  }
  
  