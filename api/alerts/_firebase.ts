/**
 * Firestore REST API helpers — zero dependencies (no firebase SDK needed).
 * Uses the Firestore v1 REST API directly via fetch().
 *
 * Required env: FIREBASE_PROJECT_ID, FIREBASE_API_KEY
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
const API_KEY    = process.env.FIREBASE_API_KEY || '';

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Firestore value converters ─────────────────────────────────────────────────

type FsValue = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: string; timestampValue?: string; mapValue?: { fields: Record<string, FsValue> }; arrayValue?: { values: FsValue[] } };

/** Convert a JS value to Firestore REST value format. */
export function toFsValue(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: 'NULL_VALUE' };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
  if (typeof v === 'object') {
    const fields: Record<string, FsValue> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) fields[k] = toFsValue(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

/** Convert a Firestore REST value back to JS. */
export function fromFsValue(v: FsValue): unknown {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue!, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) {
    const obj: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v.mapValue!.fields)) obj[k] = fromFsValue(val);
    return obj;
  }
  if ('arrayValue' in v) return (v.arrayValue!.values || []).map(fromFsValue);
  return null;
}

/** Convert a Firestore document to a plain JS object with id. */
export function docToObj(doc: { name: string; fields: Record<string, FsValue> }): Record<string, unknown> {
  const id = doc.name.split('/').pop()!;
  const obj: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) obj[k] = fromFsValue(v);
  return obj;
}

// ── CRUD operations ────────────────────────────────────────────────────────────

/** Add a document to a collection (auto-ID). */
export async function addDocument(collection: string, data: Record<string, unknown>): Promise<string> {
  const fields: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFsValue(v);

  const res = await fetch(`${BASE}/${collection}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore add to ${collection} failed: ${res.status} ${await res.text()}`);
  const doc = await res.json();
  return doc.name.split('/').pop()!; // return doc ID
}

/** Create or overwrite a document with a specific ID. */
export async function setDocument(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
  const fields: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFsValue(v);

  const res = await fetch(`${BASE}/${collection}/${docId}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore set ${collection}/${docId} failed: ${res.status}`);
}

/** Get a single document by collection/docId. */
export async function getDocument(collection: string, docId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE}/${collection}/${docId}?key=${API_KEY}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore get ${collection}/${docId} failed: ${res.status}`);
  return docToObj(await res.json());
}

/** Delete a document. */
export async function deleteDocument(collection: string, docId: string): Promise<void> {
  const res = await fetch(`${BASE}/${collection}/${docId}?key=${API_KEY}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Firestore delete ${collection}/${docId} failed: ${res.status}`);
}

/** Update specific fields on a document. */
export async function updateDocument(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
  const fields: Record<string, FsValue> = {};
  const masks: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFsValue(v);
    masks.push(k);
  }
  const maskParams = masks.map(m => `updateMask.fieldPaths=${m}`).join('&');
  const res = await fetch(`${BASE}/${collection}/${docId}?${maskParams}&key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore update ${collection}/${docId} failed: ${res.status}`);
}

/** List all documents in a collection (unfiltered, paginated via Firestore REST). */
export async function listAllDocuments(
  collection: string,
): Promise<Array<Record<string, unknown>>> {
  const all: Array<Record<string, unknown>> = [];
  let pageToken = '';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `${BASE}/${collection}?key=${API_KEY}&pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore list ${collection} failed: ${res.status}`);
    const data = await res.json();
    const docs = data.documents || [];
    for (const doc of docs) {
      if (doc.fields) all.push(docToObj(doc));
    }
    if (!data.nextPageToken || docs.length === 0) break;
    pageToken = data.nextPageToken;
  }
  return all;
}

/** Run a structured query with optional ordering and limit. */
export async function runStructuredQuery(
  collection: string,
  filters: Array<{ field: string; op: string; value: unknown }>,
  options?: { orderBy?: string; orderDir?: 'ASCENDING' | 'DESCENDING'; limit?: number },
): Promise<Array<Record<string, unknown>>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    from: [{ collectionId: collection }],
  };

  if (filters.length > 0) {
    query.where = {
      compositeFilter: {
        op: 'AND',
        filters: filters.map(f => ({
          fieldFilter: {
            field: { fieldPath: f.field },
            op: f.op,
            value: toFsValue(f.value),
          },
        })),
      },
    };
  }

  if (options?.orderBy) {
    query.orderBy = [{ field: { fieldPath: options.orderBy }, direction: options.orderDir || 'DESCENDING' }];
  }
  if (options?.limit) {
    query.limit = options.limit;
  }

  const res = await fetch(`${BASE}:runQuery?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: query }),
  });
  if (!res.ok) throw new Error(`Firestore structured query ${collection} failed: ${res.status}`);

  const results = await res.json();
  return results
    .filter((r: { document?: unknown }) => r.document)
    .map((r: { document: { name: string; fields: Record<string, FsValue> } }) => docToObj(r.document));
}

/** Query documents with structured query (WHERE clauses). */
export async function queryDocuments(
  collection: string,
  filters: Array<{ field: string; op: string; value: unknown }>
): Promise<Array<Record<string, unknown>>> {
  const compositeFilter = {
    compositeFilter: {
      op: 'AND',
      filters: filters.map(f => ({
        fieldFilter: {
          field: { fieldPath: f.field },
          op: f.op,
          value: toFsValue(f.value),
        },
      })),
    },
  };

  const res = await fetch(`${BASE}:runQuery?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: compositeFilter,
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore query ${collection} failed: ${res.status}`);

  const results = await res.json();
  return results
    .filter((r: { document?: unknown }) => r.document)
    .map((r: { document: { name: string; fields: Record<string, FsValue> } }) => docToObj(r.document));
}
