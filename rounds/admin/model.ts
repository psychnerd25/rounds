import type { Catalog, RevisionCard } from '../src/domain/content';
import { assertCatalog } from '../src/domain/catalog-validation.ts';
import { mergeCatalogUpdate, type CatalogSnapshot } from '../src/domain/catalog-sync.ts';

export const OWNER_EMAIL = 'dailydose.md.social@gmail.com';
export const MAX_BYTES = 750_000;
export type Approval = { by: string; at: string; contentVersion: number };
export type Workspace = { catalog: Catalog; approvals: Record<string, Approval> };
export type Library = { workspace: Workspace; revision: number; published: CatalogSnapshot | null; preview: CatalogSnapshot | null };
export const teaching = (c: RevisionCard) => JSON.stringify([c.subjectId,c.topicId,c.topic,c.title,c.prompt,c.facts,c.pearl,c.explanation]);
export function catalogWithCards(subjects: Catalog['subjects'], cards: RevisionCard[]): Catalog {
  const topics = [...new Map(cards.map(c => [c.topicId, {id:c.topicId,subjectId:c.subjectId,title:c.topic}])).values()];
  return assertCatalog({subjects:subjects.map(s=>({...s,topics:topics.filter(t=>t.subjectId===s.id).map(t=>t.title)})),topics,cards});
}
export function encode(value: unknown) {
  const payload = JSON.stringify(value);
  if (new TextEncoder().encode(payload).byteLength > MAX_BYTES) throw Error('The library has reached its current size limit. Export a backup and contact support before adding more.');
  return payload;
}
export function freshCard(subjectId: string, id: string = crypto.randomUUID()): RevisionCard {
  return {id,topicId:`topic:${id}`,subjectId,topic:'',title:'',prompt:'',facts:[''],pearl:'',explanation:'',seconds:30,series:'Clinical decision',sample:false,references:[],contentVersion:1,createdAt:null,publishedAt:null,updatedAt:null,difficulty:'unrated',tags:[],relatedCardIds:[],visibility:'draft',editorialStatus:'unreviewed',priority:0};
}
export function saveCard(workspace: Workspace, input: RevisionCard, reviewer: string, approved: boolean, now = new Date().toISOString()): Workspace {
  const old = workspace.catalog.cards.find(c=>c.id===input.id);
  const changed = old && teaching(old)!==teaching(input);
  const card: RevisionCard = {...structuredClone(input),contentVersion:(old?.contentVersion??1)+(changed?1:0),createdAt:old?.createdAt??now,updatedAt:now,editorialStatus:approved?'reviewed':'unreviewed'};
  if (!card.prompt?.trim()) throw Error('Add a recall question so this card works in both Recall and Read.');
  if (approved && !card.references.length) throw Error('Add at least one reference before confirming the medical review.');
  const cards = old ? workspace.catalog.cards.map(c=>c.id===card.id?card:c) : [...workspace.catalog.cards,card];
  const approvals = {...workspace.approvals};
  delete approvals[card.id];
  if (approved) approvals[card.id] = {by:reviewer,at:now,contentVersion:card.contentVersion};
  const next = {catalog:catalogWithCards(workspace.catalog.subjects,cards),approvals};
  encode(next);
  return next;
}
export function publication(library: Library, ids: string[], now = new Date().toISOString()) {
  if (!ids.length) throw Error('Choose at least one reviewed card to publish.');
  const workspace = structuredClone(library.workspace);
  const live = new Map(library.published?.catalog.cards.map(c=>[c.id,c]) ?? []);
  for (const id of ids) {
    const card = workspace.catalog.cards.find(c=>c.id===id);
    if (!card) throw Error('This card no longer exists. Refresh the library.');
    if (card.visibility==='archived') { live.delete(id); continue; }
    if (card.editorialStatus!=='reviewed' || workspace.approvals[id]?.contentVersion!==card.contentVersion) throw Error(`“${card.title}” needs its medical review confirmed before publishing.`);
    card.publishedAt ||= now;
    if (Date.parse(card.publishedAt)>Date.parse(now)) throw Error(`“${card.title}” has a future publication date. Return to publish it at that time.`);
    card.visibility='published';
    live.set(id,structuredClone(card));
  }
  const subjects = [...new Map([...(library.published?.catalog.subjects??[]),...workspace.catalog.subjects].map(s=>[s.id,s])).values()];
  const catalog = catalogWithCards(subjects,[...live.values()]);
  catalog.subjects = catalog.subjects.filter(s=>catalog.cards.some(c=>c.subjectId===s.id));
  const published = mergeCatalogUpdate(library.published,{schemaVersion:1,kind:'full',channel:'reviewed',revision:(library.published?.revision??0)+1,catalog});
  const previewCards = new Map(library.preview?.catalog.cards.map(c=>[c.id,c]) ?? []);
  for(const id of ids) {
    const card=workspace.catalog.cards.find(c=>c.id===id)!;
    if(card.visibility==='archived')previewCards.delete(id);
    else previewCards.set(id,structuredClone(card));
  }
  const previewSubjects = [...new Map([...(library.preview?.catalog.subjects??[]),...subjects].map(s=>[s.id,s])).values()];
  const preview = mergeCatalogUpdate(library.preview,{schemaVersion:1,kind:'full',channel:'preview',revision:(library.preview?.revision??0)+1,catalog:catalogWithCards(previewSubjects,[...previewCards.values()])},{allowPreview:true});
  encode(published); encode(preview); encode(workspace);
  return {workspace,published,preview};
}
export function archiveCard(workspace: Workspace, id: string): Workspace {
  const next = structuredClone(workspace);
  const card = next.catalog.cards.find(c=>c.id===id);
  if (!card) throw Error('Card not found.');
  card.visibility='archived';
  return next;
}
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], value='', quoted=false;
  text = text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted && text[i+1]==='"'){value+='"';i++;}else quoted=!quoted; }
    else if(!quoted && (c===',' || c==='\n' || c==='\r')) {
      row.push(value);value='';
      if(c!==','){if(row.some(v=>v.trim()))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}
    } else value+=c;
  }
  if(quoted)throw Error('The CSV has an unclosed quote. Export it again as CSV.');
  row.push(value);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
export function importDrafts(workspace: Workspace, text: string, filename: string, now = new Date().toISOString()): {workspace:Workspace; count:number} {
  if(new TextEncoder().encode(text).byteLength>MAX_BYTES)throw Error('This file is too large. Split it into smaller imports.');
  let incoming: RevisionCard[];
  if(filename.toLowerCase().endsWith('.json')) {
    const raw=JSON.parse(text); const source=raw.workspace?.catalog??raw.catalog??raw;
    incoming=Array.isArray(source)?source:source.cards;
    if(!Array.isArray(incoming))throw Error('The JSON must contain a cards array or a catalog.');
  } else if(filename.toLowerCase().endsWith('.csv')) {
    const [headers,...rows]=parseCsv(text);
    if(!headers || !rows.length)throw Error('Add a header row and at least one card.');
    const required=['Subject','Topic Title','Question','Next Best Step / Management','Clinical Pearl / Key Takeaway'];
    const positions=required.map(h=>headers.findIndex(v=>v.trim()===h));
    if(positions.some(p=>p<0))throw Error('Use the CSV template headers, including all five teaching columns.');
    incoming=rows.map((row,index)=>{
      const [subjectName,title,prompt,answer,pearl]=positions.map(p=>row[p]?.trim());
      if(![subjectName,title,prompt,answer,pearl].every(Boolean))throw Error(`Row ${index+2}: fill in all five teaching columns.`);
      const subject=workspace.catalog.subjects.find(s=>s.name===subjectName || s.id===subjectName);
      if(!subject)throw Error(`Row ${index+2}: unknown subject “${subjectName}”. Add it in Subjects first.`);
      const idColumn=headers.indexOf('Card ID');
      const id=idColumn>=0?row[idColumn]?.trim():undefined;
      const old=id?workspace.catalog.cards.find(c=>c.id===id):undefined;
      return {...(old??freshCard(subject.id,id||undefined)),subjectId:subject.id,title,topic:title,prompt,facts:[answer],explanation:answer,pearl};
    });
  } else throw Error('Upload a CSV or JSON file. Export Excel or Google Sheets as CSV first.');
  if(!incoming.length)throw Error('The file contains no cards.');
  const ids=new Set<string>(); let result=structuredClone(workspace);
  for(const raw of incoming) {
    if(!raw || typeof raw.id!=='string' || !raw.id.trim() || ids.has(raw.id))throw Error('Each imported card needs a unique ID. Duplicate IDs were found.');
    ids.add(raw.id);
    const old=result.catalog.cards.find(c=>c.id===raw.id);
    const input={...raw,visibility:'draft' as const,editorialStatus:'unreviewed' as const,contentVersion:old?.contentVersion??1};
    result=saveCard(result,input,'',false,now);
  }
  return {workspace:result,count:incoming.length};
}
