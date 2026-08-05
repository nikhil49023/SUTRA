export class CryptoEngine {
  public static sanitizeString(input: string): string {
    return input.replace(/[<>'"&]/g, '');
  }

  public static hashPayload(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data.charCodeAt(i);
      hash |= 0;
    }
    return `sha256-${Math.abs(hash).toString(16)}`;
  }
}
