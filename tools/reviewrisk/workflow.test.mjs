import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const checkoutSha = "3d3c42e5aac5ba805825da76410c181273ba90b1";
const setupNodeSha = "820762786026740c76f36085b0efc47a31fe5020";

const readWorkflow = (name) =>
  readFile(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8");

const readReviewRiskSource = (name) =>
  readFile(new URL(name, import.meta.url), "utf8");

const readPackage = async () =>
  JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  );

test("test script keeps trailing arguments scoped to Vitest", async () => {
  const packageJson = await readPackage();

  assert.equal(packageJson.scripts.test, "vitest run");
  assert.match(
    packageJson.scripts["precheck:full"],
    /pnpm test && pnpm test:review-risk$/,
  );
});

test("CI runs the review-risk regression suite", async () => {
  const source = await readWorkflow("ci.yml");

  assert.match(source, /- run: pnpm test\n\s+- run: pnpm test:review-risk/);
});

test("review-risk workflow pins actions and guards trusted execution", async () => {
  const source = await readWorkflow("review-risk.yml");

  assert.match(source, /types: \[opened, synchronize, reopened, edited\]/);
  assert.match(source, new RegExp(`actions/checkout@${checkoutSha}`));
  assert.match(source, new RegExp(`actions/setup-node@${setupNodeSha}`));
  assert.match(source, /persist-credentials: false/);
  assert.match(source, /contents: read/);
  assert.match(source, /pull-requests: write/);
  assert.match(source, /issues: write/);
  assert.match(
    source,
    /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/,
  );
  assert.match(
    source,
    /github\.event\.pull_request\.user\.login != 'dependabot\[bot\]'/,
  );
  assert.doesNotMatch(source, /github\.actor != 'dependabot\[bot\]'/);

  const guardIndex = source.indexOf("Self-modification guard");
  const outputIndex = source.indexOf("- name: Prepare output directory");
  const checkoutIndex = source.indexOf(`actions/checkout@${checkoutSha}`);
  const setupNodeIndex = source.indexOf(`actions/setup-node@${setupNodeSha}`);

  assert.notEqual(outputIndex, -1);
  assert.notEqual(checkoutIndex, -1);
  assert.notEqual(guardIndex, -1);
  assert.notEqual(setupNodeIndex, -1);
  assert.ok(outputIndex < checkoutIndex);
  assert.ok(guardIndex < setupNodeIndex);
  assert.match(source, /tools\/reviewrisk/);
  assert.match(source, /docs\/review-risk\.ja\.md/);
  assert.match(source, /\.github\/workflows\/review-risk\.yml/);
  assert.match(source, /\.github\/workflows\/review-risk-guard\.yml/);
  assert.match(source, /<!-- review-risk -->/);
  assert.match(source, /mktemp -d "\$RUNNER_TEMP\/review-risk\.XXXXXX"/);
  assert.match(source, /> "\$OUTPUT_DIR\/risk\.json"/);
  assert.match(source, /> "\$OUTPUT_DIR\/comment\.md"/);
  assert.match(source, /body=@"\$OUTPUT_DIR\/comment\.md"/);
  assert.match(source, /OUTPUT_DIR: \$\{\{ steps\.output\.outputs\.dir \}\}/);
  assert.match(
    source,
    /select\(\.user\.login == "github-actions\[bot\]" and \(\.body \| startswith\("<!-- review-risk -->"\)\)\)/,
  );
  assert.doesNotMatch(source, /> risk\.json$/m);
  assert.doesNotMatch(source, /> comment\.md$/m);
  assert.doesNotMatch(source, /body=@comment\.md/);
});

test("base guard treats pull request content as data only", async () => {
  const source = await readWorkflow("review-risk-guard.yml");

  assert.match(source, /pull_request_target:/);
  assert.match(source, /types: \[opened, synchronize, reopened, edited\]/);
  assert.doesNotMatch(source, /branches: \[main\]/);
  assert.match(source, new RegExp(`actions/checkout@${checkoutSha}`));
  assert.doesNotMatch(source, /actions\/setup-node@/);
  assert.doesNotMatch(source, /\bpnpm\b/);
  assert.match(source, /persist-credentials: false/);
  assert.doesNotMatch(
    source,
    /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/,
  );
  assert.match(
    source,
    /github\.event\.pull_request\.user\.login != 'dependabot\[bot\]'/,
  );
  assert.doesNotMatch(source, /github\.actor != 'dependabot\[bot\]'/);
  assert.match(
    source,
    /HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    source,
    /BASE_REF: \$\{\{ github\.event\.pull_request\.base\.ref \}\}/,
  );
  assert.match(source, /if \[ "\$BASE_REF" != "main" \]/);
  assert.match(source, /echo "target=false" >> "\$GITHUB_OUTPUT"/);
  assert.match(source, /git fetch origin "\$HEAD_SHA"/);
  assert.match(source, /git merge-tree --write-tree HEAD FETCH_HEAD/);
  assert.doesNotMatch(source, /ref:.*pull_request\.head/);
  assert.match(source, /<!-- review-risk-guard -->/);
  assert.match(source, /--method DELETE/);
  assert.match(
    source,
    /select\(\.user\.login == "github-actions\[bot\]" and \(\.body \| startswith\("<!-- review-risk -->"\)\)\)/,
  );
  assert.match(
    source,
    /select\(\.user\.login == "github-actions\[bot\]" and \(\.body \| startswith\("<!-- review-risk-guard -->"\)\)\)/,
  );

  const clearIndex = source.indexOf(
    "- name: Clear stale normal result outside main or while conflicting",
  );
  const clearGuardIndex = source.indexOf(
    "- name: Clear stale guard critical label for fork PR",
  );
  const applyIndex = source.indexOf("- name: Apply review:critical label");
  const reconcileIndex = source.indexOf(
    "- name: Reconcile guard sticky comment",
  );
  assert.notEqual(clearIndex, -1);
  assert.notEqual(clearGuardIndex, -1);
  assert.notEqual(reconcileIndex, -1);
  assert.ok(clearIndex < clearGuardIndex);
  assert.ok(clearGuardIndex < applyIndex);
  const clearStep = source.slice(clearIndex, clearGuardIndex);
  assert.match(clearStep, /steps\.guard\.outputs\.target != 'true'/);
  assert.match(clearStep, /steps\.guard\.outputs\.conflict == 'true'/);
  assert.match(clearStep, /review:\*/);
  assert.match(clearStep, /--remove-label/);
  assert.match(clearStep, /<!-- review-risk -->/);
  assert.match(clearStep, /--method DELETE/);

  const clearGuardStep = source.slice(clearGuardIndex, applyIndex);
  assert.match(clearGuardStep, /steps\.guard\.outputs\.target == 'true'/);
  assert.match(clearGuardStep, /steps\.guard\.outputs\.self != 'true'/);
  assert.match(
    clearGuardStep,
    /pull_request\.head\.repo\.full_name != github\.repository/,
  );
  assert.match(clearGuardStep, /--remove-label "review:critical"/);

  const applyStep = source.slice(applyIndex, reconcileIndex);
  assert.match(applyStep, /steps\.guard\.outputs\.target == 'true'/);
  assert.match(applyStep, /steps\.guard\.outputs\.self == 'true'/);
});

test("CLI entrypoint uses await with a terminal catch", async () => {
  const source = await readReviewRiskSource("main.mjs");

  assert.match(source, /includeContents: isTestFile/);
  assert.match(source, /await runEntrypoint\(\)\.catch\(/);
  assert.doesNotMatch(source, /\.then\(/);
});
