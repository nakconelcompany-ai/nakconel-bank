export async function createTransfer(): Promise<never> {
  throw new Error('Bank transfers are unavailable until a licensed payment provider is connected.');
}
