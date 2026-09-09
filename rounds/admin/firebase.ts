import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, browserSessionPersistence, setPersistence, connectAuthEmulator, type User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, getDocs, collection, setDoc, runTransaction, serverTimestamp, connectFirestoreEmulator } from 'firebase/firestore';
import config from './firebase-config.json';
import { encode, publication, OWNER_EMAIL, type Workspace, type Library } from './model';
import { assertCatalog } from '../src/domain/catalog-validation';
import { parseCatalogUpdate, type CatalogSnapshot } from '../src/domain/catalog-sync';

const app=initializeApp(config);
export const auth=getAuth(app), db=getFirestore(app);
// Enabled only in the separate local test build; production bundling removes this branch.
declare const __ADMIN_EMULATOR__: boolean;
if(__ADMIN_EMULATOR__) {
  if(!['localhost','127.0.0.1'].includes(location.hostname))throw Error('Emulator build requires localhost');
  connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  connectFirestoreEmulator(db,'127.0.0.1',8089);
}
export { onAuthStateChanged, signOut };
export type { User };
const workspaceRef=doc(db,'editorial/workspace'), publishedRef=doc(db,'published/catalog'), previewRef=doc(db,'published/preview');
export async function login() {
  await setPersistence(auth,browserSessionPersistence);
  const provider=new GoogleAuthProvider(); provider.setCustomParameters({prompt:'select_account'});
  return signInWithPopup(auth,provider);
}
export async function allowed(user:User) {
  if(!user.emailVerified || !user.email)return false;
  if(user.email===OWNER_EMAIL)return true;
  return (await getDocFromServer(doc(db,'adminUsers',user.email))).data()?.enabled===true;
}
function readSnapshot(data:any, allowPreview=false) {
  if(!data)return null;
  const snapshot=parseCatalogUpdate(JSON.parse(data.payload),{allowPreview});
  if(snapshot.kind!=='full' || snapshot.revision!==data.revision)throw Error('The published catalog is invalid. Contact support.');
  return snapshot;
}
export async function loadLibrary():Promise<Library> {
  const [w,p,v]=await Promise.all([getDocFromServer(workspaceRef),getDocFromServer(publishedRef),getDocFromServer(previewRef)]);
  if(!w.exists())throw Error('The content library has not been initialized. Contact the project owner.');
  const workspace=JSON.parse(w.data().payload) as Workspace;
  assertCatalog(workspace.catalog);
  if(!workspace.approvals || !Number.isSafeInteger(w.data().revision))throw Error('The private library is invalid. Restore a verified backup.');
  return {workspace,revision:w.data().revision,published:readSnapshot(p.data()),preview:readSnapshot(v.data(),true)};
}
function record(payload:unknown,revision:number) {
  return {payload:encode(payload),revision,updatedAt:serverTimestamp(),updatedBy:auth.currentUser?.email};
}
function conflict() {throw Error('Another editor changed the library. Refresh and try again.');}
export async function saveWorkspace(library:Library,workspace:Workspace):Promise<void> {
  await runTransaction(db,async transaction=>{
    const current=await transaction.get(workspaceRef);
    if(current.data()?.revision!==library.revision)conflict();
    transaction.set(workspaceRef,record(workspace,library.revision+1));
  });
}

// Simple workflow: the editor changes only the five teaching fields. Internal
// IDs/versioning remain hidden. Every save updates both preview and the public
// App Store/Play Store catalog so content changes do not require a new binary.
export async function saveWorkspaceToPreview(library:Library, workspace:Workspace):Promise<void> {
  assertCatalog(workspace.catalog);
  const preview: CatalogSnapshot = {
    schemaVersion: 1,
    kind: 'full',
    channel: 'preview',
    revision: (library.preview?.revision ?? 0) + 1,
    catalog: workspace.catalog,
  };
  const published: CatalogSnapshot = {
    schemaVersion: 1,
    kind: 'full',
    channel: 'public',
    revision: (library.published?.revision ?? 0) + 1,
    catalog: workspace.catalog,
  };
  parseCatalogUpdate(preview, {allowPreview:true});
  parseCatalogUpdate(published);
  await runTransaction(db, async transaction => {
    const [w,v,p] = await Promise.all([
      transaction.get(workspaceRef),
      transaction.get(previewRef),
      transaction.get(publishedRef),
    ]);
    if (
      w.data()?.revision !== library.revision ||
      (v.data()?.revision ?? 0) !== (library.preview?.revision ?? 0) ||
      (p.data()?.revision ?? 0) !== (library.published?.revision ?? 0)
    ) conflict();
    transaction.set(workspaceRef, record(workspace, library.revision + 1));
    transaction.set(previewRef, record(preview, preview.revision));
    transaction.set(publishedRef, record(published, published.revision));
  });
}

// Retained only for compatibility with older tooling; the simple editor uses
// saveWorkspaceToPreview above and does not expose a separate publish step.
export async function publishCards(library:Library,ids:string[]) {
  const next=publication(library,ids);
  await runTransaction(db,async transaction=>{
    const [w,p,v]=await Promise.all([transaction.get(workspaceRef),transaction.get(publishedRef),transaction.get(previewRef)]);
    if(w.data()?.revision!==library.revision || (p.data()?.revision??0)!==(library.published?.revision??0) || (v.data()?.revision??0)!==(library.preview?.revision??0))conflict();
    transaction.set(workspaceRef,record(next.workspace,library.revision+1));
    transaction.set(publishedRef,record(next.published,next.published.revision));
    transaction.set(previewRef,record(next.preview,next.preview.revision));
  });
}
export async function listEditors() {
  return (await getDocs(collection(db,'adminUsers'))).docs.map(d=>({email:d.id,enabled:d.data().enabled===true}));
}
export async function setEditor(email:string,enabled:boolean) {
  email=email.trim().toLowerCase();
  if(!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email) || email===OWNER_EMAIL)throw Error('Enter another editor’s valid Google email.');
  await setDoc(doc(db,'adminUsers',email),{enabled,updatedAt:serverTimestamp(),updatedBy:auth.currentUser?.email});
}
