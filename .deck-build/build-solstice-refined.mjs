import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const SKILL_DIR = "/Users/ashwinshrivastav/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.11814/skills/presentations";
const workspaceDir = "/Users/ashwinshrivastav/Documents/GitHub/MHacks/SolanaAbstractionLayer";
const TMP_DIR = path.join(workspaceDir, ".deck-build");
const FINAL_PPTX = path.join(workspaceDir, "output", "SOLstice-presentation-refined-v2.pptx");
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href);

const C = {
  bg: "#0C1720",
  ivory: "#F4EEE2",
  text: "#C2C9D3",
  muted: "#8190A1",
  line: "#3D4A59",
  orange: "#FF5538",
  lime: "#D6E34D",
  blue: "#2D62D4",
  paper: "#F4EEE2",
  ink: "#0C1720",
};
const F = { serif: "Georgia", sans: "Arial", mono: "Courier New" };
const slideSize = { width: 1280, height: 720 };

function addText(slide, text, x, y, width, height, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width, height },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: options.font ?? F.sans,
    fontSize: options.size ?? 20,
    bold: options.bold ?? false,
    color: options.color ?? C.text,
    ...(options.italic ? { italic: true } : {}),
    ...(options.alignment ? { alignment: options.alignment } : {}),
    ...(options.verticalAlignment ? { verticalAlignment: options.verticalAlignment } : {}),
    autoFit: "shrinkText",
  };
  return shape;
}

function box(slide, x, y, width, height, options = {}) {
  return slide.shapes.add({
    geometry: options.geometry ?? "rect",
    position: { left: x, top: y, width, height },
    fill: options.fill ?? "none",
    line: options.line ?? { style: "solid", fill: C.line, width: 1 },
    ...(options.radius ? { borderRadius: options.radius } : {}),
  });
}

function rule(slide, x, y, width, color = C.line, height = 1) {
  return box(slide, x, y, width, height, { fill: color, line: { fill: "none", width: 0 } });
}

function arrow(slide, x, y, width, color = C.lime) {
  return slide.shapes.add({
    geometry: "rightArrow",
    position: { left: x, top: y, width, height: 14 },
    fill: color,
    line: { fill: "none", width: 0 },
  });
}

function dot(slide, x, y, color, size = 20) {
  return slide.shapes.add({
    geometry: "ellipse",
    position: { left: x, top: y, width: size, height: size },
    fill: color,
    line: { fill: "none", width: 0 },
  });
}

function header(slide, number, label) {
  addText(slide, `${number} / ${label.toUpperCase()}`, 72, 50, 390, 24, {
    font: F.mono, size: 14, bold: true, color: number === "02" ? C.lime : number === "03" ? C.blue : C.orange,
  });
}

function footer(slide, number, label) {
  rule(slide, 68, 650, 1144, C.line);
  addText(slide, number, 68, 668, 48, 20, { font: F.mono, size: 13, bold: true, color: C.orange });
  addText(slide, `SOLstice / ${label.toUpperCase()}`, 120, 668, 720, 20, { font: F.mono, size: 12, color: C.text });
}

function label(slide, text, x, y, width, color = C.muted) {
  return addText(slide, text.toUpperCase(), x, y, width, 18, { font: F.mono, size: 12, bold: true, color });
}

const presentation = Presentation.create({ slideSize });

// Slide 1
{
  const s = presentation.slides.add();
  s.background.fill = C.bg;
  addText(s, "SOLstice", 72, 68, 490, 90, { font: F.serif, size: 70, bold: true, color: C.ivory });
  rule(s, 74, 184, 164, C.orange, 3);
  addText(s, "Conditions beyond\non-chain state", 78, 207, 450, 90, { font: F.mono, size: 27, bold: true, color: C.orange });
  addText(s, "Program an escrow rule around a real-world condition.\nSOLstice delivers a verified result that a Solana program can enforce.", 78, 365, 480, 62, { font: F.sans, size: 22, color: C.ivory });
  addText(s, "Ashwin Shrivastav, Akhil Swaminathan\nSudeep Gowda, Joshua Asirvatham", 72, 533, 330, 34, { font: F.mono, size: 12, color: C.text });
  label(s, "MHacks", 1080, 614, 130, C.text);

  box(s, 590, 164, 578, 348, { fill: "#091118", line: { style: "solid", fill: C.line, width: 1 }, radius: 14 });
  label(s, "Condition execution layer", 626, 197, 300, C.text);
  addText(s, "“Release escrow when\nthe condition is verified.”", 626, 238, 300, 72, { font: F.serif, size: 27, bold: true, color: C.ivory });
  rule(s, 626, 333, 500, C.line);
  label(s, "Verifier result", 626, 358, 180, C.muted);
  addText(s, "condition_result = true", 626, 383, 270, 30, { font: F.mono, size: 20, bold: true, color: C.lime });
  arrow(s, 897, 390, 64, C.lime);
  label(s, "Solana program", 982, 358, 150, C.muted);
  addText(s, "release_escrow()", 970, 383, 185, 30, { font: F.mono, size: 16, bold: true, color: C.ivory });
  addText(s, "A verified condition becomes an on-chain fact.\nThe contract handles the settlement.", 626, 442, 470, 42, { font: F.sans, size: 16, color: C.text });
  footer(s, "01", "Project overview");
  s.speakerNotes.textFrame.setText("SOLstice connects off-chain verification with on-chain enforcement in a devnet proof of concept. A centralized verifier submits a condition result; the Solana program enforces the escrow rule.");
  s.speakerNotes.setVisible(true);
}

// Slide 2
{
  const s = presentation.slides.add();
  s.background.fill = C.bg;
  header(s, "02", "Execution model");
  addText(s, "How a Solana program executes", 72, 98, 760, 62, { font: F.serif, size: 46, bold: true, color: C.ivory });
  addText(s, "A transaction calls the program. The program reads the supplied on-chain accounts and decides what state can change.", 76, 190, 870, 42, { font: F.sans, size: 21, color: C.text });

  const tx = box(s, 76, 286, 300, 190, { fill: C.paper, line: { fill: "none", width: 0 } });
  box(s, 76, 286, 10, 190, { fill: C.orange, line: { fill: "none", width: 0 } });
  label(s, "Transaction", 108, 316, 190, C.blue);
  addText(s, "release_escrow", 108, 354, 220, 32, { font: F.mono, size: 23, bold: true, color: C.ink });
  rule(s, 108, 402, 220, "#B9B3A8");
  addText(s, "Instruction plus\nthe accounts it can read or change", 108, 419, 220, 43, { font: F.sans, size: 15, color: C.ink });

  arrow(s, 414, 376, 88, C.lime);
  const program = box(s, 542, 286, 266, 190, { fill: C.blue, line: { fill: "none", width: 0 } });
  label(s, "Program", 572, 316, 180, C.ivory);
  addText(s, "Checks the\nrule", 572, 353, 205, 70, { font: F.serif, size: 31, bold: true, color: C.ivory, alignment: "center" });
  addText(s, "on-chain logic", 572, 434, 205, 22, { font: F.mono, size: 14, color: C.ivory, alignment: "center" });

  arrow(s, 846, 376, 88, C.lime);
  label(s, "On-chain state", 970, 315, 190, C.lime);
  addText(s, "Release SOL\nor keep escrow locked", 970, 355, 220, 72, { font: F.serif, size: 29, bold: true, color: C.ivory });

  rule(s, 76, 548, 1132, C.line);
  label(s, "What sits outside the transaction", 76, 575, 350, C.orange);
  addText(s, "News, delivery status, documents, and other real-world facts need a trusted path into the program.", 76, 601, 930, 26, { font: F.sans, size: 18, color: C.ivory });
  footer(s, "02", "Execution model");
  s.speakerNotes.textFrame.setText("Solana programs execute when an instruction in a transaction invokes them. The instruction supplies the accounts the program can read or modify. Source: https://solana.com/docs/core/programs and https://solana.com/docs/core.");
  s.speakerNotes.setVisible(true);
}

// Slide 3
{
  const s = presentation.slides.add();
  s.background.fill = C.bg;
  header(s, "03", "The SOLstice layer");
  addText(s, "External conditions,\non-chain enforcement", 72, 98, 745, 110, { font: F.serif, size: 48, bold: true, color: C.ivory });
  addText(s, "SOLstice turns a condition outside Solana into a result the program can enforce.", 78, 229, 950, 34, { font: F.sans, size: 21, color: C.text });

  rule(s, 112, 421, 1044, C.line, 2);
  const steps = [
    { x: 112, color: C.orange, tag: "Condition", title: "A milestone\nneeds proof", body: "The user defines\nwhat must be true" },
    { x: 390, color: C.blue, tag: "Verification", title: "Evidence supports\nthe condition", body: "SOLstice checks\nthe available evidence" },
    { x: 668, color: C.orange, tag: "Verifier", title: "true / false", body: "The verifier writes\na result it controls" },
    { x: 946, color: C.lime, tag: "Program", title: "Rule can\nexecute", body: "The Solana program\nchecks that result" },
  ];
  for (const [index, item] of steps.entries()) {
    dot(s, item.x, 409, item.color, 24);
    const top = index % 2 === 0;
    const ty = top ? 300 : 450;
    label(s, item.tag, item.x - 8, ty, 210, item.color);
    addText(s, item.title, item.x - 8, ty + 23, 215, 54, { font: F.serif, size: 21, bold: true, color: C.ivory });
    addText(s, item.body, item.x - 8, ty + 82, 210, 42, { font: F.sans, size: 14, color: C.text });
    if (index < steps.length - 1) arrow(s, item.x + 32, 416, 194, C.line);
  }

  box(s, 72, 590, 1136, 42, { fill: "#101D28", line: { style: "solid", fill: C.orange, width: 1 }, radius: 8 });
  addText(s, "The smart contract still enforces its own rule. SOLstice supplies the verified condition it can read.", 96, 600, 1060, 22, { font: F.sans, size: 17, color: C.ivory, alignment: "center" });
  footer(s, "03", "External condition layer");
  s.speakerNotes.textFrame.setText("The application lets users define real-world conditions when available evidence can support checks. Public web and Reddit search snippets are evaluated off-chain, then the centralized verifier submits a signed result. The verifier is trusted in this devnet proof of concept.");
  s.speakerNotes.setVisible(true);
}

// Slide 4
{
  const s = presentation.slides.add();
  s.background.fill = C.bg;
  header(s, "04", "Automatic settlement");
  addText(s, "One condition.\nAutomatic settlement.", 72, 98, 650, 110, { font: F.serif, size: 49, bold: true, color: C.ivory });
  addText(s, "The developer sets the rule once. The program executes when the verifier reports that the condition passed.", 78, 228, 880, 34, { font: F.sans, size: 20, color: C.text });

  const left = box(s, 72, 310, 370, 230, { fill: "#0A1219", line: { style: "solid", fill: C.line, width: 1 }, radius: 12 });
  label(s, "Developer condition", 104, 340, 220, C.orange);
  addText(s, "Release escrow when\nthe claim is verified.", 104, 375, 290, 66, { font: F.serif, size: 27, bold: true, color: C.ivory });
  addText(s, "Enabled automation waits for\nthe condition to trigger.", 104, 470, 260, 42, { font: F.sans, size: 15, color: C.text });

  arrow(s, 470, 411, 92, C.lime);
  const middle = box(s, 590, 310, 258, 230, { fill: C.blue, line: { fill: "none", width: 0 }, radius: 12 });
  label(s, "Verifier result", 618, 341, 180, C.ivory);
  addText(s, "condition_result\n= true", 618, 389, 202, 58, { font: F.mono, size: 17, bold: true, color: C.ivory, alignment: "center" });
  addText(s, "A signed result reaches\nthe program", 618, 474, 202, 34, { font: F.sans, size: 14, color: C.ivory, alignment: "center" });

  arrow(s, 876, 411, 92, C.lime);
  const right = box(s, 995, 310, 213, 230, { fill: "#101D28", line: { style: "solid", fill: C.lime, width: 2 }, radius: 12 });
  label(s, "Solana program", 1023, 341, 160, C.lime);
  addText(s, "release_\nescrow()", 1023, 386, 160, 58, { font: F.mono, size: 22, bold: true, color: C.ivory, alignment: "center" });
  addText(s, "Escrow settles\non devnet", 1023, 476, 160, 34, { font: F.sans, size: 14, color: C.text, alignment: "center" });

  rule(s, 72, 589, 1136, C.line);
  label(s, "Demo contract path", 72, 607, 210, C.lime);
  addText(s, "Enabled", 323, 602, 124, 24, { font: F.mono, size: 17, bold: true, color: C.ivory, alignment: "center" });
  arrow(s, 449, 608, 48, C.line);
  addText(s, "Triggered", 512, 602, 136, 24, { font: F.mono, size: 17, bold: true, color: C.ivory, alignment: "center" });
  arrow(s, 652, 608, 48, C.line);
  addText(s, "Verified", 714, 602, 124, 24, { font: F.mono, size: 17, bold: true, color: C.ivory, alignment: "center" });
  arrow(s, 843, 608, 48, C.line);
  addText(s, "Executed", 906, 602, 140, 24, { font: F.mono, size: 17, bold: true, color: C.lime, alignment: "center" });
  footer(s, "04", "Automatic settlement");
  s.speakerNotes.textFrame.setText("The demo starts after the user enables a condition. A simulated trigger starts the real verification runner. The centralized verifier records the result. The Solana program can release a linked, funded devnet escrow after it receives a passing result.");
  s.speakerNotes.setVisible(true);
}

await fs.mkdir(path.join(workspaceDir, ".codex-finalizer"), { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });
const candidatePath = path.join(workspaceDir, ".codex-finalizer", "solstice-refined-candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const result = await finalizePresentation({
  explicitTotalSlideCount: 4,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: "/Users/ashwinshrivastav/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3",
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  fontPolicy: {
    basis: "reference",
    families: ["Georgia", "Courier New", "Arial"],
    referencePath: "/Users/ashwinshrivastav/Downloads/SOLstice-presentation-dark-v2 [Autosaved].pptx",
    referenceSha256: "875ec76fae605eb1fa0812f50044fdb11d16b2cc152662bb4b9990729de71a7f",
  },
  verifyArtifactToolImport: true,
  receiptPath: path.join(workspaceDir, ".codex-finalizer", "SOLstice-presentation-refined-v2.validation.json"),
});

console.log(JSON.stringify({ finalPath: FINAL_PPTX, result }, null, 2));
