# Soustack MCP Server

This repository hosts the Soustack MCP server, a small Model Context Protocol (MCP) service that exposes Soustack functionality over stdio.

## Build

```sh
npm install
npm run build
```

## Run (development)

```sh
npm run dev
```

## Run (production)

```sh
node dist/cli.js
```

## Stdin/stdout request format

The server communicates over stdio using JSON messages per line with the following protocol:

Request:

```json
{ "id": "...", "tool": "tool.name", "input": { } }
```

Response (success):

```json
{ "id": "...", "ok": true, "output": { } }
```

Response (error):

```json
{ "id": "...", "ok": false, "error": { } }
```

## Example invocation

Ping request:

```json
{ "id": "ping-1", "tool": "ping", "input": { } }
```

Ping response:

```json
{ "id": "ping-1", "ok": true, "output": { "ok": true } }
```

Soustack meta request:

```json
{ "id": "meta-1", "tool": "soustack.meta", "input": { } }
```

Soustack meta response:

```json
{ "id": "meta-1", "ok": true, "output": { "mcpVersion": "0.1.0", "soustackVersion": null, "specVersion": null, "supportedProfiles": ["lite", "base", "timed", "scalable", "illustrated", "equipped", "prepped"], "timestamp": "2024-01-01T00:00:00.000Z" } }
```

Soustack validate request (invalid recipe):

```json
{ "id": "validate-1", "tool": "soustack.validate", "input": { "recipe": { "title": "", "ingredients": [] } } }
```

Soustack validate response (invalid recipe):

```json
{ "id": "validate-1", "ok": false, "error": { "message": "Recipe validation failed", "issues": ["title is required", "ingredients must not be empty"] } }
```
