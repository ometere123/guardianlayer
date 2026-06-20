const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ||
  "https://explorer-studio.genlayer.com";

export function getGenLayerTxUrl(txHash: string): string {
  return `${EXPLORER_BASE}/transactions/${txHash}`;
}

export function getGenLayerContractUrl(address: string): string {
  return `${EXPLORER_BASE}/contracts/${address}`;
}
