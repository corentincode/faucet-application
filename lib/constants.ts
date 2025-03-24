// Avec variables d'environnement
const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0xC22a65500298265Ba826EC3741C0Da414854D124";

// Vérifier que l'adresse commence bien par 0x
if (!tokenAddress.startsWith('0x')) {
  throw new Error('TOKEN_ADDRESS doit commencer par 0x');
}

export const TOKEN_ADDRESS = tokenAddress as `0x${string}`;