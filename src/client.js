/**
 * HTTP client wrapper for the Product Arena API.
 */

import { getApiKey, getBaseUrl } from "./config.js";

export class APIError extends Error {
  constructor(status, message) {
    super(`[${status}] ${message}`);
    this.status = status;
  }
}

export class ProductArenaClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || getApiKey();
    this.baseUrl = (options.baseUrl || getBaseUrl()).replace(/\/+$/, "");
  }

  _headers(auth = true) {
    const h = { "Content-Type": "application/json" };
    if (auth && this.apiKey) h["x-api-key"] = this.apiKey;
    return h;
  }

  async _request(method, path, { auth = true, body, params } = {}) {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) url += `?${qs}`;
    }

    const opts = { method, headers: this._headers(auth) };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }

    if (!res.ok) {
      const msg = typeof data === "object" ? data.error || JSON.stringify(data) : String(data);
      throw new APIError(res.status, msg);
    }
    return data;
  }

  // ── Products ──────────────────────────────────────────

  getProducts() {
    return this._request("GET", "/api/products");
  }

  addProduct(url, arenaType, category) {
    const body = { url, arenaType };
    if (category) body.category = category;
    return this._request("POST", "/api/products", { body });
  }

  removeProduct({ url, domain } = {}) {
    const body = {};
    if (url) body.url = url;
    else if (domain) body.domain = domain;
    return this._request("DELETE", "/api/products", { body });
  }

  // ── Comments ──────────────────────────────────────────

  getComments(domain, page = 0) {
    return this._request("GET", "/api/comments", {
      auth: false,
      params: { domain, page: String(page) },
    });
  }

  addComment(domain, content) {
    return this._request("POST", "/api/comments", {
      body: { domain, content },
    });
  }

  // ── Leaderboard ───────────────────────────────────────

  getLeaderboard({ sort = "all", range = "all", category } = {}) {
    const params = { sort, range };
    if (category) params.category = category;
    return this._request("GET", "/api/leaderboard", { auth: false, params });
  }

  // ── Bookmarks ─────────────────────────────────────────

  getBookmarks() {
    return this._request("GET", "/api/bookmarks");
  }

  addBookmark(url) {
    return this._request("POST", "/api/bookmarks", { body: { url } });
  }

  removeBookmark(id) {
    return this._request("DELETE", "/api/bookmarks", { body: { id } });
  }

  // ── Stats ─────────────────────────────────────────────

  getStats() {
    return this._request("GET", "/api/stats", { auth: false });
  }
}
