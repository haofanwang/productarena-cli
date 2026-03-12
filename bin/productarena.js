#!/usr/bin/env node

/**
 * 🏟 Product Arena CLI
 */

import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { ProductArenaClient, APIError } from "../src/client.js";
import * as config from "../src/config.js";

const program = new Command();

// ── Helpers ─────────────────────────────────────────────

function getClient(opts) {
  const globalOpts = program.opts();
  return new ProductArenaClient({
    apiKey: globalOpts.key,
    baseUrl: globalOpts.baseUrl,
  });
}

function requireKey() {
  const globalOpts = program.opts();
  const key = globalOpts.key || config.getApiKey();
  if (!key) {
    console.error(
      chalk.red.bold("✗") +
        " No API key configured.\n" +
        `  Run ${chalk.cyan("productarena config set-key <KEY>")} first,\n` +
        `  or pass ${chalk.cyan("--key <KEY>")}, or set ${chalk.cyan("PRODUCTARENA_API_KEY")} env var.`
    );
    process.exit(1);
  }
}

function handleError(err) {
  if (err instanceof APIError) {
    console.error(chalk.red.bold(`✗ API Error [${err.status}]:`) + ` ${err.message}`);
  } else {
    console.error(chalk.red.bold("✗ Error:") + ` ${err.message}`);
  }
  process.exit(1);
}

function maskKey(key) {
  if (!key || key.length < 12) return key || "not set";
  return key.slice(0, 8) + "…" + key.slice(-4);
}

// ── Program ─────────────────────────────────────────────

program
  .name("productarena")
  .description("🏟  Product Arena CLI — manage products, explore leaderboards, and more.")
  .version("0.1.0")
  .option("--key <key>", "API key (overrides config)")
  .option("--base-url <url>", "Base URL (overrides config)");

// ── Config ──────────────────────────────────────────────

const configCmd = program.command("config").description("⚙️  Manage CLI configuration");

configCmd
  .command("set-key <key>")
  .description("Save your API key")
  .action((key) => {
    config.setApiKey(key);
    console.log(chalk.green("✓") + ` API key saved: ${chalk.dim(maskKey(key))}`);
  });

configCmd
  .command("set-url <url>")
  .description("Set the API base URL")
  .action((url) => {
    config.setBaseUrl(url);
    console.log(chalk.green("✓") + ` Base URL set: ${chalk.dim(url)}`);
  });

configCmd
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const cfg = config.getAll();
    const table = new Table({
      chars: { mid: "", "left-mid": "", "mid-mid": "", "right-mid": "" },
      style: { "padding-left": 1, "padding-right": 1 },
    });
    table.push(
      [chalk.cyan.bold("API Key"), maskKey(cfg.api_key) || chalk.dim("not set")],
      [chalk.cyan.bold("Base URL"), cfg.base_url],
      [chalk.cyan.bold("Config"), cfg.config_path]
    );
    console.log(table.toString());
  });

// ── Products ────────────────────────────────────────────

const productsCmd = program.command("products").description("📦  Manage your Hits & Misses product lists");

productsCmd
  .command("list")
  .description("List your products")
  .option("--type <type>", "Filter: all, hits, misses, tbd", "all")
  .action(async (opts) => {
    requireKey();
    try {
      const data = await getClient().getProducts();
      const sections = [];
      if (["all", "hits"].includes(opts.type))
        sections.push({ label: "🔥 Hits", items: data.hits || [], color: chalk.green });
      if (["all", "misses"].includes(opts.type))
        sections.push({ label: "💀 Misses", items: data.misses || [], color: chalk.red });
      if (["all", "tbd"].includes(opts.type))
        sections.push({ label: "🤔 TBD", items: data.tbd || [], color: chalk.yellow });

      for (const { label, items, color } of sections) {
        if (!items.length) {
          console.log(`\n  ${label}: ${chalk.dim("empty")}`);
          continue;
        }
        console.log(`\n  ${color.bold(label)}`);
        const table = new Table({
          head: ["#", "Title", "Domain", "URL"].map((h) => chalk.dim(h)),
          colWidths: [5, 30, 22, 40],
          wordWrap: true,
          style: { "padding-left": 1, "padding-right": 1 },
        });
        items.forEach((p, i) => {
          table.push([
            chalk.dim(String(i + 1)),
            p.title || "—",
            chalk.cyan(p.domain || ""),
            chalk.dim(p.url || ""),
          ]);
        });
        console.log(table.toString());
      }
    } catch (err) {
      handleError(err);
    }
  });

productsCmd
  .command("add <url>")
  .description("Add a product to your list")
  .requiredOption("--type <type>", "hits or misses")
  .option("--category <cat>", "Category: image-video, audio, agent, productivity")
  .action(async (url, opts) => {
    requireKey();
    try {
      const result = await getClient().addProduct(url, opts.type, opts.category);
      const icon = opts.type === "hits" ? "🔥" : "💀";
      console.log(
        chalk.green("✓") +
          ` ${icon} Added ${chalk.bold(result.title || url)} (${result.domain || ""}) to ${opts.type}`
      );
    } catch (err) {
      handleError(err);
    }
  });

productsCmd
  .command("remove <target>")
  .description("Remove a product from your list")
  .option("--by <field>", "Match by: url or domain", "url")
  .action(async (target, opts) => {
    requireKey();
    try {
      if (opts.by === "domain") {
        await getClient().removeProduct({ domain: target });
      } else {
        await getClient().removeProduct({ url: target });
      }
      console.log(chalk.green("✓") + ` Removed ${chalk.bold(target)}`);
    } catch (err) {
      handleError(err);
    }
  });

// ── Leaderboard ─────────────────────────────────────────

program
  .command("leaderboard")
  .description("🏆  Show the product leaderboard")
  .option("--sort <sort>", "Sort: all, hits, misses", "all")
  .option("--range <range>", "Range: all, 1d, 1w, 1m", "all")
  .option("--category <cat>", "Category filter")
  .option("--limit <n>", "Max items", "20")
  .action(async (opts) => {
    try {
      const items = await getClient().getLeaderboard({
        sort: opts.sort,
        range: opts.range,
        category: opts.category,
      });

      if (!items.length) {
        console.log(chalk.dim("No entries found."));
        return;
      }

      console.log(
        `\n  ${chalk.bold("🏆 Leaderboard")}  ${chalk.dim(`sort=${opts.sort}  range=${opts.range}`)}\n`
      );

      const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
      const table = new Table({
        head: ["#", "Product", "Domain", "🔥 Hits", "💀 Misses", "Net"].map((h) => chalk.dim(h)),
        colAligns: ["left", "left", "left", "right", "right", "right"],
        colWidths: [6, 28, 20, 10, 11, 8],
        wordWrap: true,
        style: { "padding-left": 1, "padding-right": 1 },
      });

      const limit = parseInt(opts.limit, 10);
      items.slice(0, limit).forEach((item, i) => {
        const rank = medals[i + 1] || String(i + 1);
        const net = (item.hits || 0) - (item.misses || 0);
        const netStr = net > 0 ? chalk.green(`+${net}`) : net < 0 ? chalk.red(String(net)) : "0";
        table.push([
          rank,
          item.title || "—",
          chalk.cyan(item.domain || ""),
          chalk.green(String(item.hits || 0)),
          chalk.red(String(item.misses || 0)),
          netStr,
        ]);
      });

      console.log(table.toString());
    } catch (err) {
      handleError(err);
    }
  });

// ── Comments ────────────────────────────────────────────

const commentsCmd = program.command("comments").description("💬  View and post comments on products");

commentsCmd
  .command("list <domain>")
  .description("List comments for a product")
  .option("--page <n>", "Page number (0-indexed)", "0")
  .action(async (domain, opts) => {
    try {
      const data = await getClient().getComments(domain, parseInt(opts.page, 10));
      const items = data.comments || [];
      if (!items.length) {
        console.log(chalk.dim(`No comments for ${domain}.`));
        return;
      }

      console.log(`\n  ${chalk.bold("💬 Comments for")} ${chalk.cyan(domain)}  (${data.total} total)\n`);
      for (const c of items) {
        const user = c.user || {};
        const name = user.displayName || user.username || "anonymous";
        const date = (c.createdAt || "").slice(0, 10);
        console.log(`  ${chalk.bold(name)}  ${chalk.dim(date)}`);
        console.log(`  ${c.content || ""}\n`);
      }
    } catch (err) {
      handleError(err);
    }
  });

commentsCmd
  .command("add <domain> <content>")
  .description("Post a comment on a product")
  .action(async (domain, content) => {
    requireKey();
    try {
      await getClient().addComment(domain, content);
      console.log(chalk.green("✓") + ` Comment posted on ${chalk.cyan(domain)}`);
    } catch (err) {
      handleError(err);
    }
  });

// ── Stats ───────────────────────────────────────────────

program
  .command("stats")
  .description("📊  Show platform statistics")
  .action(async () => {
    try {
      const data = await getClient().getStats();
      const lines = [
        "",
        `  ${chalk.bold("📊 Platform Stats")}`,
        "",
        `  👥 Users:     ${chalk.bold(data.users ?? "—")}`,
        `  📦 Products:  ${chalk.bold(data.products ?? "—")}`,
        "",
      ];
      console.log(lines.join("\n"));
    } catch (err) {
      handleError(err);
    }
  });

// ── Whoami ──────────────────────────────────────────────

program
  .command("whoami")
  .description("🔑  Test your API key by fetching your products")
  .action(async () => {
    requireKey();
    try {
      const data = await getClient().getProducts();
      const hits = (data.hits || []).length;
      const misses = (data.misses || []).length;
      console.log(
        chalk.green("✓") +
          ` API key is valid!  You have ${chalk.bold(hits)} hits and ${chalk.bold(misses)} misses.`
      );
    } catch (err) {
      handleError(err);
    }
  });

// ── Parse ───────────────────────────────────────────────

program.parse();
