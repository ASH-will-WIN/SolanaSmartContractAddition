import { schema, table, t } from 'spacetimedb/server';

// This module intentionally exposes public rows and development-open reducers for
// the local hackathon demo. TODO: restrict writes to an authorized worker identity.
const condition = table(
  { name: 'condition', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity().index('btree'),
    prompt: t.string(),
    status: t.string(),
    finalResult: t.option(t.bool()),
    settlementStatus: t.string(),
    settlementSignature: t.option(t.string()),
    dealId: t.option(t.u64()),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const verificationCheck = table(
  { name: 'verification_check', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    conditionId: t.u64().index('btree'),
    sequence: t.u32(),
    kind: t.string(),
    label: t.string(),
    instruction: t.string(),
    status: t.string(),
    passed: t.option(t.bool()),
    summary: t.option(t.string()),
    evidenceCount: t.u32(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const evidence = table(
  { name: 'evidence', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    conditionId: t.u64().index('btree'),
    checkId: t.u64().index('btree'),
    sourceType: t.string(),
    title: t.string(),
    url: t.option(t.string()),
    snippet: t.string(),
    authorOrSource: t.option(t.string()),
    sourcePublishedAt: t.option(t.string()),
    relevanceScore: t.option(t.f32()),
    createdAt: t.timestamp(),
  },
);

const uploadedDocument = table(
  { name: 'uploaded_document', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    conditionId: t.u64().index('btree'),
    fileName: t.string(),
    mimeType: t.string(),
    byteCount: t.u64(),
    contentHash: t.string(),
    storageReference: t.string(),
    extractionStatus: t.string(),
    textExcerpt: t.option(t.string()),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const spacetimedb = schema({ condition, verificationCheck, evidence, uploadedDocument });
export default spacetimedb;

function requireCondition(ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0], id: bigint) {
  const row = ctx.db.condition.id.find(id);
  if (!row) throw new Error(`Condition ${id} was not found`);
  return row;
}

function requireCheck(ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0], id: bigint) {
  const row = ctx.db.verificationCheck.id.find(id);
  if (!row) throw new Error(`Verification check ${id} was not found`);
  return row;
}

function requireDocument(ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0], id: bigint) {
  const row = ctx.db.uploadedDocument.id.find(id);
  if (!row) throw new Error(`Uploaded document ${id} was not found`);
  return row;
}

export const create_condition = spacetimedb.reducer({ prompt: t.string() }, (ctx, { prompt }) => {
  if (!prompt.trim()) throw new Error('Condition prompt cannot be empty');
  ctx.db.condition.insert({
    id: 0n,
    owner: ctx.sender,
    prompt: prompt.trim(),
    status: 'draft',
    finalResult: undefined,
    settlementStatus: 'idle',
    settlementSignature: undefined,
    dealId: undefined,
    createdAt: ctx.timestamp,
    updatedAt: ctx.timestamp,
  });
});

export const set_condition_status = spacetimedb.reducer(
  { conditionId: t.u64(), status: t.string() },
  (ctx, { conditionId, status }) => {
    if (!['draft', 'planning', 'verifying', 'resolved', 'failed'].includes(status)) throw new Error('Invalid condition status');
    const row = requireCondition(ctx, conditionId);
    ctx.db.condition.id.update({ ...row, status, updatedAt: ctx.timestamp });
  },
);

export const add_verification_check = spacetimedb.reducer(
  { conditionId: t.u64(), sequence: t.u32(), kind: t.string(), label: t.string(), instruction: t.string() },
  (ctx, args) => {
    requireCondition(ctx, args.conditionId);
    ctx.db.verificationCheck.insert({
      id: 0n,
      ...args,
      status: 'pending',
      passed: undefined,
      summary: undefined,
      evidenceCount: 0,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
  },
);

export const set_check_running = spacetimedb.reducer({ checkId: t.u64() }, (ctx, { checkId }) => {
  const row = requireCheck(ctx, checkId);
  ctx.db.verificationCheck.id.update({ ...row, status: 'running', updatedAt: ctx.timestamp });
  const parent = requireCondition(ctx, row.conditionId);
  ctx.db.condition.id.update({ ...parent, status: 'verifying', updatedAt: ctx.timestamp });
});

export const complete_check = spacetimedb.reducer(
  { checkId: t.u64(), passed: t.bool(), summary: t.string() },
  (ctx, { checkId, passed, summary }) => {
    const row = requireCheck(ctx, checkId);
    ctx.db.verificationCheck.id.update({ ...row, status: passed ? 'passed' : 'failed', passed, summary, updatedAt: ctx.timestamp });
    const parent = requireCondition(ctx, row.conditionId);
    ctx.db.condition.id.update({ ...parent, updatedAt: ctx.timestamp });
  },
);

export const set_check_error = spacetimedb.reducer(
  { checkId: t.u64(), summary: t.string() },
  (ctx, { checkId, summary }) => {
    const row = requireCheck(ctx, checkId);
    ctx.db.verificationCheck.id.update({ ...row, status: 'error', passed: undefined, summary, updatedAt: ctx.timestamp });
    const parent = requireCondition(ctx, row.conditionId);
    ctx.db.condition.id.update({ ...parent, status: 'failed', finalResult: undefined, updatedAt: ctx.timestamp });
  },
);

export const add_evidence = spacetimedb.reducer(
  {
    conditionId: t.u64(),
    checkId: t.u64(),
    sourceType: t.string(),
    title: t.string(),
    url: t.option(t.string()),
    snippet: t.string(),
    authorOrSource: t.option(t.string()),
    sourcePublishedAt: t.option(t.string()),
    relevanceScore: t.option(t.f32()),
  },
  (ctx, args) => {
    const parent = requireCondition(ctx, args.conditionId);
    const check = requireCheck(ctx, args.checkId);
    if (check.conditionId !== args.conditionId) throw new Error('Evidence condition does not match its check');
    ctx.db.evidence.insert({
      id: 0n,
      ...args,
      url: args.url ?? undefined,
      authorOrSource: args.authorOrSource ?? undefined,
      sourcePublishedAt: args.sourcePublishedAt ?? undefined,
      relevanceScore: args.relevanceScore ?? undefined,
      createdAt: ctx.timestamp,
    });
    ctx.db.verificationCheck.id.update({ ...check, evidenceCount: check.evidenceCount + 1, updatedAt: ctx.timestamp });
    ctx.db.condition.id.update({ ...parent, updatedAt: ctx.timestamp });
  },
);

export const record_uploaded_document = spacetimedb.reducer(
  {
    conditionId: t.u64(),
    fileName: t.string(),
    mimeType: t.string(),
    byteCount: t.u64(),
    contentHash: t.string(),
    storageReference: t.string(),
  },
  (ctx, args) => {
    const parent = requireCondition(ctx, args.conditionId);
    ctx.db.uploadedDocument.insert({
      id: 0n,
      ...args,
      extractionStatus: 'uploaded',
      textExcerpt: undefined,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
    ctx.db.condition.id.update({ ...parent, updatedAt: ctx.timestamp });
  },
);

export const set_document_extraction_status = spacetimedb.reducer(
  { documentId: t.u64(), status: t.string(), textExcerpt: t.option(t.string()) },
  (ctx, { documentId, status, textExcerpt }) => {
    if (!['uploaded', 'extracting', 'ready', 'failed'].includes(status)) throw new Error('Invalid document extraction status');
    const row = requireDocument(ctx, documentId);
    ctx.db.uploadedDocument.id.update({ ...row, extractionStatus: status, textExcerpt, updatedAt: ctx.timestamp });
    const parent = requireCondition(ctx, row.conditionId);
    ctx.db.condition.id.update({ ...parent, updatedAt: ctx.timestamp });
  },
);

export const resolve_condition = spacetimedb.reducer(
  { conditionId: t.u64(), result: t.bool() },
  (ctx, { conditionId, result }) => {
    const row = requireCondition(ctx, conditionId);
    ctx.db.condition.id.update({
      ...row,
      status: 'resolved',
      finalResult: result,
      settlementStatus: result ? 'ready' : 'idle',
      updatedAt: ctx.timestamp,
    });
  },
);

export const record_settlement_status = spacetimedb.reducer(
  { conditionId: t.u64(), status: t.string(), signature: t.option(t.string()) },
  (ctx, { conditionId, status, signature }) => {
    if (!['idle', 'ready', 'submitted', 'confirmed', 'failed'].includes(status)) throw new Error('Invalid settlement status');
    const row = requireCondition(ctx, conditionId);
    if (status !== 'idle' && row.finalResult !== true) throw new Error('Settlement requires a true condition result');
    ctx.db.condition.id.update({ ...row, settlementStatus: status, settlementSignature: signature, updatedAt: ctx.timestamp });
  },
);

export const associate_demo_deal = spacetimedb.reducer(
  { conditionId: t.u64(), dealId: t.u64() },
  (ctx, { conditionId, dealId }) => {
    const row = requireCondition(ctx, conditionId);
    if (row.finalResult === true && row.settlementStatus === 'confirmed') throw new Error('A confirmed condition cannot change its deal');
    ctx.db.condition.id.update({ ...row, dealId, updatedAt: ctx.timestamp });
  },
);
