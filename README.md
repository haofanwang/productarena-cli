# 🏟 Product Arena CLI

A command-line tool for interacting with the [Product Arena](https://www.productarena.co) API — vote on products, manage your Hits & Misses lists, explore leaderboards, and post comments.

## Installation

```bash
cd productarena-cli
npm install
npm link    # makes `productarena` available globally
```

## Quick Start

```bash
# 1. Set your API key (get one at https://www.productarena.co/docs)
productarena config set-key pa_your_key_here

# 2. Verify it works
productarena whoami

# 3. Explore the leaderboard
productarena leaderboard
```

## Usage

### Configuration

```bash
# Save your API key
productarena config set-key pa_xxxx

# Set a custom base URL (e.g. for local development)
productarena config set-url http://localhost:3000

# View current config
productarena config show
```

You can also use environment variables:
- `PRODUCTARENA_API_KEY` — overrides the saved API key
- `PRODUCTARENA_BASE_URL` — overrides the saved base URL

### Products

```bash
# List your Hits & Misses
productarena products list

# Filter by type
productarena products list --type hits

# Add a product to Hits
productarena products add https://cursor.com --type hits

# Add with a category
productarena products add https://suno.ai --type hits --category audio

# Remove a product
productarena products remove https://cursor.com

# Remove by domain
productarena products remove cursor.com --by domain
```

### Leaderboard

```bash
# Full leaderboard
productarena leaderboard

# Top hits this week
productarena leaderboard --sort hits --range 1w

# Filter by category, show top 10
productarena leaderboard --category agent --limit 10
```

### Comments

```bash
# View comments for a product
productarena comments list cursor.com

# Post a comment
productarena comments add cursor.com "Amazing code editor!"
```

### Other

```bash
# Platform stats
productarena stats

# Test your API key
productarena whoami

# Version info
productarena --version
```

### Global Options

Every command supports these flags:

```bash
# Override API key for a single command
productarena --key pa_xxxx products list

# Override base URL (useful for local testing)
productarena --base-url http://localhost:3000 leaderboard
```

## Local Development

To test against your local Product Arena instance:

```bash
productarena config set-url http://localhost:3000
productarena leaderboard
productarena stats
```

## License

MIT
