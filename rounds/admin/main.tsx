import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  auth,
  allowed,
  loadLibrary,
  login,
  onAuthStateChanged,
  saveWorkspaceToPreview,
  signOut,
  type User,
} from './firebase';
import {
  freshCard,
  importDrafts,
  saveCard,
  type Library,
  type Workspace,
} from './model';
import type { RevisionCard } from '../src/domain/content';

const emptyForm = {
  id: '',
  subjectId: '',
  title: '',
  question: '',
  management: '',
  pearl: '',
};

type FormState = typeof emptyForm;

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [library, setLibrary] = useState<Library | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setBusy(true);
    setStatus('Loading content…');
    try {
      const next = await loadLibrary();
      setLibrary(next);
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load content.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    setUser(nextUser);
    setAuthorized(false);
    setLibrary(null);
    if (!nextUser) return;
    try {
      const ok = await allowed(nextUser);
      setAuthorized(ok);
      if (ok) await reload();
    } catch {
      setStatus('Could not verify editor access.');
    }
  }), []);

  const cards = useMemo(() => {
    if (!library) return [];
    const q = query.trim().toLowerCase();
    if (!q) return library.workspace.catalog.cards;
    return library.workspace.catalog.cards.filter((card) =>
      [card.title, card.prompt, card.facts.join(' '), card.pearl]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [library, query]);

  const edit = (card: RevisionCard) => setForm({
    id: card.id,
    subjectId: card.subjectId,
    title: card.title,
    question: card.prompt ?? '',
    management: card.facts[0] ?? card.explanation,
    pearl: card.pearl,
  });

  const reset = () => setForm({
    ...emptyForm,
    subjectId: library?.workspace.catalog.subjects[0]?.id ?? '',
  });

  const save = async () => {
    if (!library) return;
    const values = [form.subjectId, form.title, form.question, form.management, form.pearl];
    if (values.some((value) => !value.trim())) {
      setStatus('Please fill all five fields.');
      return;
    }
    setBusy(true);
    setStatus('Saving…');
    try {
      const subject = library.workspace.catalog.subjects.find((item) => item.id === form.subjectId);
      if (!subject) throw new Error('Choose a subject.');
      const existing = form.id
        ? library.workspace.catalog.cards.find((card) => card.id === form.id)
        : undefined;
      const base = existing ?? freshCard(subject.id);
      const input: RevisionCard = {
        ...base,
        subjectId: subject.id,
        topic: form.title.trim(),
        title: form.title.trim(),
        prompt: form.question.trim(),
        facts: [form.management.trim()],
        explanation: form.management.trim(),
        pearl: form.pearl.trim(),
        visibility: 'published',
        editorialStatus: 'unreviewed',
      };
      const workspace = saveCard(library.workspace, input, '', false);
      await saveWorkspaceToPreview(library, workspace);
      setStatus(form.id ? 'Card updated.' : 'Card added.');
      reset();
      await reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save card.');
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async (file: File) => {
    if (!library) return;
    setBusy(true);
    setStatus('Importing…');
    try {
      const text = await file.text();
      const imported = importDrafts(library.workspace, text, file.name);
      const workspace: Workspace = {
        ...imported.workspace,
        catalog: {
          ...imported.workspace.catalog,
          cards: imported.workspace.catalog.cards.map((card) => ({
            ...card,
            visibility: 'published' as const,
          })),
        },
      };
      await saveWorkspaceToPreview(library, workspace);
      setStatus(`Imported ${imported.count} cards.`);
      await reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not import CSV.');
    } finally {
      setBusy(false);
    }
  };

  if (!user) return <main className="center"><section className="card login">
    <div className="brand">Rounds</div>
    <h1>Content editor</h1>
    <p>Add or edit the same five fields used in the content sheet.</p>
    <button onClick={() => void login()}>Sign in with Google</button>
  </section></main>;

  if (!authorized) return <main className="center"><section className="card login">
    <h1>No editor access</h1>
    <p>This Google account is not allowed to edit Rounds content.</p>
    <button className="secondary" onClick={() => void signOut(auth)}>Sign out</button>
  </section></main>;

  if (!library) return <main className="center"><section className="card login"><p>{status || 'Loading…'}</p></section></main>;

  return <main className="shell">
    <header>
      <div>
        <div className="brand">Rounds</div>
        <p className="muted">Simple content editor</p>
      </div>
      <div className="header-actions">
        <label className="upload secondary">
          Import CSV
          <input type="file" accept=".csv,text/csv" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importCsv(file);
            event.currentTarget.value = '';
          }} />
        </label>
        <button className="secondary" onClick={() => void signOut(auth)}>Sign out</button>
      </div>
    </header>

    <section className="layout">
      <aside className="card list">
        <div className="list-head">
          <h2>Content</h2>
          <button className="small" onClick={reset}>+ New</button>
        </div>
        <input
          className="search"
          placeholder="Search cards"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="items">
          {cards.map((card) => <button key={card.id} className="item" onClick={() => edit(card)}>
            <strong>{card.title}</strong>
            <span>{library.workspace.catalog.subjects.find((s) => s.id === card.subjectId)?.name}</span>
          </button>)}
        </div>
      </aside>

      <section className="card editor">
        <div>
          <p className="eyebrow">{form.id ? 'Edit card' : 'New card'}</p>
          <h1>{form.id ? form.title || 'Untitled card' : 'Add content'}</h1>
          <p className="muted">Only the five fields from the original Excel sheet are editable here.</p>
        </div>

        <label>Subject
          <select value={form.subjectId} onChange={(event) => setForm({...form, subjectId:event.target.value})}>
            <option value="">Choose subject</option>
            {library.workspace.catalog.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>

        <label>Topic Title
          <input value={form.title} onChange={(event) => setForm({...form,title:event.target.value})} />
        </label>

        <label>Question
          <textarea rows={3} value={form.question} onChange={(event) => setForm({...form,question:event.target.value})} />
        </label>

        <label>Next Best Step / Management
          <textarea rows={6} value={form.management} onChange={(event) => setForm({...form,management:event.target.value})} />
        </label>

        <label>Clinical Pearl / Key Takeaway
          <textarea rows={4} value={form.pearl} onChange={(event) => setForm({...form,pearl:event.target.value})} />
        </label>

        <div className="actions">
          <button disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : form.id ? 'Save changes' : 'Add card'}</button>
          {form.id && <button className="secondary" onClick={reset}>Cancel</button>}
        </div>
        {status && <p className="status">{status}</p>}
      </section>
    </section>
  </main>;
}

const style = document.createElement('style');
style.textContent = `
  :root{font-family:Inter,system-ui,sans-serif;color:#24272f;background:#f5f0e7}*{box-sizing:border-box}body{margin:0}button,input,textarea,select{font:inherit}button,.upload{border:0;border-radius:12px;background:#315f59;color:white;padding:11px 16px;font-weight:700;cursor:pointer}.secondary{background:#ebe3d8;color:#4b4b48}.center{min-height:100vh;display:grid;place-items:center;padding:24px}.shell{max-width:1180px;margin:auto;padding:24px}.card{background:#fffdf8;border:1px solid #dfd7ca;border-radius:22px;box-shadow:0 8px 30px #5d51430b}.login{max-width:440px;padding:34px}.brand{font-family:Georgia,serif;font-size:28px;font-weight:700;color:#315f59}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.header-actions,.actions{display:flex;gap:10px;align-items:center}.upload input{display:none}.layout{display:grid;grid-template-columns:330px 1fr;gap:20px}.list{padding:18px;min-height:650px}.list-head{display:flex;justify-content:space-between;align-items:center}.list h2{margin:0}.small{padding:8px 11px}.search,input,textarea,select{width:100%;border:1px solid #d9d1c5;background:white;border-radius:11px;padding:12px;color:#24272f}.search{margin:14px 0}.items{display:flex;flex-direction:column;gap:7px;max-height:550px;overflow:auto}.item{display:flex;flex-direction:column;align-items:flex-start;text-align:left;background:#f6f1e9;color:#292b2f;padding:12px}.item span{font-size:12px;color:#777269;margin-top:4px}.editor{padding:28px;display:flex;flex-direction:column;gap:18px}.editor h1{margin:3px 0 5px;font-family:Georgia,serif}.editor label{display:flex;flex-direction:column;gap:7px;font-weight:700;font-size:13px}.editor textarea{resize:vertical;line-height:1.5}.muted{color:#777269}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:#7d7162;font-weight:800;margin:0}.status{padding:12px;background:#eff4ef;border-radius:10px}.actions{margin-top:4px}@media(max-width:760px){.shell{padding:14px}.layout{grid-template-columns:1fr}.list{min-height:auto}.items{max-height:240px}header{align-items:flex-start;gap:12px;flex-direction:column}.header-actions{width:100%;flex-wrap:wrap}.editor{padding:20px}}
`;
document.head.appendChild(style);
createRoot(document.getElementById('root')!).render(<App />);
