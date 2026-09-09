import config from "./publisher.json";

function httpsUrl(value: string): `https://${string}` {
  if (!value.startsWith("https://")) throw new Error("Publisher links must use HTTPS");
  return value as `https://${string}`;
}

export default {
  ...config,
  instagramUrl: httpsUrl(config.instagramUrl),
  websiteUrl: httpsUrl(config.websiteUrl),
  supportUrl: httpsUrl(config.supportUrl),
  privacyUrl: httpsUrl(config.privacyUrl),
};
