export class AutoReconnect {
  public static startAutoReconnectLoop(onReconnect: () => void): () => void {
    const timer = setInterval(() => {
      onReconnect();
    }, 5000);
    return () => clearInterval(timer);
  }
}
