import { localContentRepository } from "./local/content";
import { createRemoteContentRepository } from "./remote/content";
import { resolveContentConfig } from "./content-config";

// Expo embeds EXPO_PUBLIC values in the app. This URL is public, never a secret.
const config = resolveContentConfig(__DEV__, process.env.EXPO_PUBLIC_CONTENT_API_URL,
  process.env.EXPO_PUBLIC_PREVIEW_CONTENT_API_URL);
export const contentRepository = config.endpoint
  ? createRemoteContentRepository({ ...config, endpoint: config.endpoint, fallback: localContentRepository })
  : localContentRepository;
