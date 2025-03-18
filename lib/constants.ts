export const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as string;

// Fallback pour le développement local si nécessaire
if (!TOKEN_ADDRESS) {
  console.warn("TOKEN_ADDRESS not set in environment variables, using default");
}