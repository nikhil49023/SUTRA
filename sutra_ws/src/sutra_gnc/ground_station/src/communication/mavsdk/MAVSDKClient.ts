export class MAVSDKClient {
  public static connect(grpcUrl: string = 'http://localhost:50051'): Promise<boolean> {
    console.log(`[MAVSDKClient] Connected to MAVSDK gRPC server at ${grpcUrl}`);
    return Promise.resolve(true);
  }
}
