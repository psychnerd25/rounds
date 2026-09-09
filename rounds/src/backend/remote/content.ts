import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContentClient, type RemoteContentOptions } from "./content-client";
export type { RemoteContentOptions } from "./content-client";

export function createRemoteContentRepository(options: RemoteContentOptions) {
  return createContentClient(options, AsyncStorage);
}
