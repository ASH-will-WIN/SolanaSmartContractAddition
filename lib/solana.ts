import { createHash, randomInt } from "crypto";
import { readFileSync } from "fs";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

const CONFIG_SEED = Buffer.from("config");
const DEAL_SEED = Buffer.from("deal");
const ESCROW_SEED = Buffer.from("escrow");
const u64 = (n: number | bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const discriminator = (name: string) => createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
export const conditionHash = (id: string) => createHash("sha256").update(id).digest();

function requireDevnet(value = process.env.SOLANA_RPC_URL ?? "") {
  if (!value.includes("devnet")) throw new Error("Refusing to run: SOLANA_RPC_URL must point to Solana devnet.");
  return value;
}
type KeypairPathName = "PAYER_KEYPAIR_PATH" | "VERIFIER_KEYPAIR_PATH" | "RECIPIENT_KEYPAIR_PATH";

function keypair(pathName: KeypairPathName) {
  const jsonName = pathName.replace("_PATH", "_JSON") as "PAYER_KEYPAIR_JSON" | "VERIFIER_KEYPAIR_JSON" | "RECIPIENT_KEYPAIR_JSON";
  const json = process.env[jsonName];
  if (json) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(json)));

  const path = process.env[pathName];
  if (!path) throw new Error(`Missing ${jsonName} or ${pathName}`);
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))));
}
export function solana() {
  const id = process.env.PROGRAM_ID; if (!id) throw new Error("Missing PROGRAM_ID");
  return { connection: new Connection(requireDevnet(), "confirmed"), programId: new PublicKey(id), payer: keypair("PAYER_KEYPAIR_PATH"), verifier: keypair("VERIFIER_KEYPAIR_PATH"), recipient: keypair("RECIPIENT_KEYPAIR_PATH") };
}
export function addresses(programId: PublicKey, dealId: number) {
  const [config] = PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
  const [deal] = PublicKey.findProgramAddressSync([DEAL_SEED, u64(dealId)], programId);
  const [escrow] = PublicKey.findProgramAddressSync([ESCROW_SEED, deal.toBuffer()], programId);
  return { config, deal, escrow };
}
async function send(ixs: TransactionInstruction[], signer: Keypair) { const { connection } = solana(); return sendAndConfirmTransaction(connection, new Transaction().add(...ixs), [signer], { commitment: "confirmed" }); }

export async function ensureConfig() {
  const s = solana(), a = addresses(s.programId, 0);
  if (await s.connection.getAccountInfo(a.config)) return a.config;
  const data = Buffer.concat([discriminator("initialize_config"), s.verifier.publicKey.toBuffer()]);
  await send([new TransactionInstruction({ programId: s.programId, data, keys: [{ pubkey: a.config, isSigner: false, isWritable: true }, { pubkey: s.payer.publicKey, isSigner: true, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }] })], s.payer);
  return a.config;
}
export async function createAndFundDeal(conditionId: string, amountSol = 0.1) {
  const s = solana(), amount = Math.round(amountSol * LAMPORTS_PER_SOL), condition = conditionHash(conditionId);
  await ensureConfig();
  // A Next.js route can reload while the on-chain PDA remains. Pick an unused
  // random ID by checking chain state instead of relying on an in-memory counter.
  let dealId = 0;
  let a: ReturnType<typeof addresses> | undefined;
  for (let attempt = 0; attempt < 10; attempt++) {
    dealId = randomInt(1, 2 ** 32);
    a = addresses(s.programId, dealId);
    if (!(await s.connection.getAccountInfo(a.deal))) break;
    a = undefined;
  }
  if (!a) throw new Error("Could not find an unused deal ID; please retry.");
  const create = Buffer.concat([discriminator("create_deal"), u64(dealId), s.recipient.publicKey.toBuffer(), condition, u64(amount)]);
  const createIx = new TransactionInstruction({ programId: s.programId, data: create, keys: [{ pubkey: a.deal, isSigner: false, isWritable: true }, { pubkey: s.payer.publicKey, isSigner: true, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }] });
  const fund = Buffer.concat([discriminator("fund_deal"), u64(amount)]);
  const fundIx = new TransactionInstruction({ programId: s.programId, data: fund, keys: [{ pubkey: a.deal, isSigner: false, isWritable: true }, { pubkey: a.escrow, isSigner: false, isWritable: true }, { pubkey: s.payer.publicKey, isSigner: true, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }] });
  const signature = await send([createIx, fundIx], s.payer);
  return { dealId, recipient: s.recipient.publicKey.toBase58(), createSignature: signature, fundSignature: signature, escrowBalance: await s.connection.getBalance(a.escrow), amountLamports: amount };
}
export async function submitCondition(dealId: number, conditionId: string, result: boolean) {
  const s = solana(), a = addresses(s.programId, dealId), data = Buffer.concat([discriminator("submit_condition_result"), conditionHash(conditionId), Buffer.from([Number(result)])]);
  return send([new TransactionInstruction({ programId: s.programId, data, keys: [{ pubkey: a.config, isSigner: false, isWritable: false }, { pubkey: a.deal, isSigner: false, isWritable: true }, { pubkey: s.verifier.publicKey, isSigner: true, isWritable: false }] })], s.verifier);
}
export async function releaseDeal(dealId: number) {
  const s = solana(), a = addresses(s.programId, dealId), before = await s.connection.getBalance(s.recipient.publicKey);
  const signature = await send([new TransactionInstruction({ programId: s.programId, data: discriminator("release_payment"), keys: [{ pubkey: a.deal, isSigner: false, isWritable: true }, { pubkey: a.escrow, isSigner: false, isWritable: true }, { pubkey: s.recipient.publicKey, isSigner: false, isWritable: true }, { pubkey: s.payer.publicKey, isSigner: true, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }] })], s.payer);
  return { signature, recipientBalanceBefore: before, recipientBalanceAfter: await s.connection.getBalance(s.recipient.publicKey) };
}
export async function getDeal(dealId: number) {
  const s = solana(), a = addresses(s.programId, dealId), raw = await s.connection.getAccountInfo(a.deal); if (!raw) throw new Error("Deal not found");
  const d = raw.data, offset = 8; // Anchor account discriminator
  const amount = Number(d.readBigUInt64LE(offset + 8 + 32 + 32 + 32)); const flags = offset + 8 + 32 + 32 + 32 + 8;
  const recipient = new PublicKey(d.subarray(offset + 8 + 32, offset + 8 + 64)).toBase58();
  return { dealId: Number(d.readBigUInt64LE(offset)), recipient, amountLamports: amount, conditionResult: d[flags] === 1, hasResult: d[flags + 1] === 1, funded: d[flags + 2] === 1, released: d[flags + 3] === 1, escrowBalance: await s.connection.getBalance(a.escrow), recipientBalance: await s.connection.getBalance(new PublicKey(recipient)) };
}
export const asSol = (lamports: number) => lamports / LAMPORTS_PER_SOL;
