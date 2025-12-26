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
{ "id": "ping-1", "ok": true, "output": { "pong": true } }
```

Soustack meta request:

```json
{ "id": "meta-1", "tool": "soustack.meta", "input": { } }
```

Soustack meta response:

```json
{ "id": "meta-1", "ok": true, "output": { "mcpVersion": "0.1.0", "soustackVersion": null, "specVersion": null, "supportedProfiles": ["lite", "base", "timed", "scalable", "illustrated", "equipped", "prepped", "minimal", "core"], "timestamp": "2024-01-01T00:00:00.000Z" } }
```

Soustack validate request (invalid recipe):

```json
{ "id": "validate-1", "tool": "soustack.validate", "input": { "recipe": { "title": "", "ingredients": [] } } }
```

Soustack validate response (invalid recipe):

```json
{ "id": "validate-1", "ok": true, "output": { "ok": false, "warnings": [], "schemaErrors": [{ "path": "/name", "message": "Required" }], "conformanceIssues": [] } }
```

## Tool schema

All responses follow the stdio contract: `{ "id": string, "ok": boolean, ... }`. Tool failures surface as `ok:false` with a consistent error envelope: `{ "error": { "code": string, "message": string, "details"?: unknown } }`. Common error codes include `BAD_JSON`, `INVALID_REQUEST`, `UNKNOWN_TOOL`, `MODULE_UNAVAILABLE`, `INVALID_MODE`, `INVALID_MULTIPLIER`, `CONVERSION_FAILED`, and `SCALE_FAILED`.

### `soustack.meta`
Input: `{}`  
Output:
```json
{
  "mcpVersion": "0.1.0",
  "soustackVersion": "0.4.0",
  "specVersion": "0.3.0",
  "supportedProfiles": ["lite","base","timed","scalable","illustrated","equipped","prepped","minimal","core"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `soustack.validate`
Input: `{ "recipe": unknown, "options"?: { "profile"?: string, "mode"?: "schema" | "full", "includeNormalized"?: boolean } }`  
Output:
```json
{
  "ok": true,
  "warnings": [],
  "schemaErrors": [],
  "conformanceIssues": [],
  "normalizedRecipe": { }
}
```

### `soustack.detectProfiles`
Input: `{ "recipe": unknown }`  
Output: `{ "profiles": string[] }`

### `soustack.scale`
Input: `{ "recipe": unknown, "options": { "multiplier": number } }`  
Output:
```json
{
  "recipe": { },
  "equipment": [ ]
}
```

### `soustack.convert`
Input: `{ "from": "schemaorg" | "soustack", "to": "schemaorg" | "soustack", "payload": unknown }`  
Output: `{ "payload": { } }`
