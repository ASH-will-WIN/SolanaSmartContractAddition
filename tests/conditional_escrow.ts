import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { createHash } from "crypto";
const hash = (s: string) => [...createHash("sha256").update(s).digest()];
const expectFail = async (p: Promise<unknown>) => {
  let failed = false;
  try { await p; } catch (error) { failed = true; assert.exists(error); }
  assert.isTrue(failed, "expected transaction to fail");
};

describe("conditional_escrow", () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program: any = anchor.workspace.ConditionalEscrow;
  const verifier = anchor.web3.Keypair.generate(), attacker = anchor.web3.Keypair.generate(), recipient = anchor.web3.Keypair.generate();
  const condition = "housing_fifty_percent_done", amount = new anchor.BN(100_000_000), dealId = new anchor.BN(1);
  const [config] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [deal] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("deal"), dealId.toArrayLike(Buffer, "le", 8)], program.programId);
  const [escrow] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("escrow"), deal.toBuffer()], program.programId);
  before(async () => { await provider.connection.requestAirdrop(verifier.publicKey, 2_000_000_000); await provider.connection.requestAirdrop(attacker.publicKey, 1_000_000_000); });
  it("initializes config", async () => { await program.methods.initializeConfig(verifier.publicKey).accounts({ config, authority: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId }).rpc(); const c = await program.account.config.fetch(config); assert.equal(c.verifier.toBase58(), verifier.publicKey.toBase58()); });
  it("creates and funds a deal", async () => { await program.methods.createDeal(dealId, recipient.publicKey, hash(condition), amount).accounts({ deal, creator: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId }).rpc(); await program.methods.fundDeal(amount).accounts({ deal, escrow, creator: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId }).rpc(); const d = await program.account.deal.fetch(deal); assert.isTrue(d.funded); assert.equal((await provider.connection.getBalance(escrow)).toString(), amount.toString()); });
  it("rejects unauthorized verifier and wrong condition", async () => { await expectFail(program.methods.submitConditionResult(hash(condition), false).accounts({ config, deal, verifier: attacker.publicKey }).signers([attacker]).rpc()); await expectFail(program.methods.submitConditionResult(hash("wrong"), false).accounts({ config, deal, verifier: verifier.publicKey }).signers([verifier]).rpc()); });
  it("accepts false, then rejects payment", async () => { await program.methods.submitConditionResult(hash(condition), false).accounts({ config, deal, verifier: verifier.publicKey }).signers([verifier]).rpc(); await expectFail(program.methods.releasePayment().accounts({ deal, escrow, recipient: recipient.publicKey, caller: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId }).rpc()); });
  it("accepts true later, releases exactly once, and recipient receives funds", async () => { const before = await provider.connection.getBalance(recipient.publicKey); await program.methods.submitConditionResult(hash(condition), true).accounts({ config, deal, verifier: verifier.publicKey }).signers([verifier]).rpc(); await program.methods.releasePayment().accounts({ deal, escrow, recipient: recipient.publicKey, caller: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId }).rpc(); assert.equal((await provider.connection.getBalance(recipient.publicKey)) - before, amount.toNumber()); await expectFail(program.methods.releasePayment().accounts({ deal, escrow, recipient: recipient.publicKey, caller: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId }).rpc()); });
  it("does not release an unfunded deal", async () => { const id = new anchor.BN(2); const [unfunded] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("deal"), id.toArrayLike(Buffer, "le", 8)], program.programId); const [unfundedEscrow] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("escrow"), unfunded.toBuffer()], program.programId); await program.methods.createDeal(id, recipient.publicKey, hash(condition), amount).accounts({ deal: unfunded, creator: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId }).rpc(); await program.methods.submitConditionResult(hash(condition), true).accounts({ config, deal: unfunded, verifier: verifier.publicKey }).signers([verifier]).rpc(); await expectFail(program.methods.releasePayment().accounts({ deal: unfunded, escrow: unfundedEscrow, recipient: recipient.publicKey, caller: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId }).rpc()); });
});
