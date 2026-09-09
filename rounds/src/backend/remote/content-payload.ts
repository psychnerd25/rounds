/** Firestore is used only as a public content endpoint, without a learner login/SDK. */
export function contentPayload(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw) return raw;
  const document = raw as { fields?: { payload?: { stringValue?: unknown }; revision?: { integerValue?: string } } };
  if (typeof document?.fields?.payload?.stringValue !== 'string') return raw;
  const value = JSON.parse(document.fields.payload.stringValue);
  if (Number(document.fields.revision?.integerValue) !== value?.revision) throw Error('Content document revision does not match its catalog');
  return value;
}
