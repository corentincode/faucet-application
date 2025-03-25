// Avec variables d'environnement
const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0xC22a65500298265Ba826EC3741C0Da414854D124";
const nftAddress = process.env.NEXT_PUBLIC_NFT_ADDRESS || "0xc01E126b297DDe2D36b327489970DC7ecb7F8D69";
const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x2FF66D304FA28cbaa3fDaa595e27Bd0Ae7200A81";

// Vérifier que les adresses commencent bien par 0x
if (!tokenAddress.startsWith('0x')) {
  throw new Error('TOKEN_ADDRESS doit commencer par 0x');
}

if (!nftAddress.startsWith('0x')) {
  throw new Error('NFT_ADDRESS doit commencer par 0x');
}

if (!marketplaceAddress.startsWith('0x')) {
  throw new Error('MARKETPLACE_ADDRESS doit commencer par 0x');
}

export const TOKEN_ADDRESS = tokenAddress as `0x${string}`;
export const NFT_ADDRESS = nftAddress as `0x${string}`;
export const MARKETPLACE_ADDRESS = marketplaceAddress as `0x${string}`;