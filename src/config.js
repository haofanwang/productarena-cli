/**
 * Configuration management — persists API key and base URL to ~/.productarena.json
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_PATH = join(homedir(), ".productarena.json");
const DEFAULT_BASE_URL = "https://www.productarena.co";

function load() {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

function save(data) {
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getApiKey() {
  return process.env.PRODUCTARENA_API_KEY || load().api_key || null;
}

export function setApiKey(key) {
  const data = load();
  data.api_key = key;
  save(data);
}

export function getBaseUrl() {
  return process.env.PRODUCTARENA_BASE_URL || load().base_url || DEFAULT_BASE_URL;
}

export function setBaseUrl(url) {
  const data = load();
  data.base_url = url.replace(/\/+$/, "");
  save(data);
}

export function getAll() {
  const data = load();
  return {
    api_key: process.env.PRODUCTARENA_API_KEY || data.api_key || null,
    base_url: process.env.PRODUCTARENA_BASE_URL || data.base_url || DEFAULT_BASE_URL,
    config_path: CONFIG_PATH,
  };
}
