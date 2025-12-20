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

The server communicates over stdio using JSON messages per line. A minimal request looks like:

```json
{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}
```

Responses are emitted to stdout as JSON lines, for example:

```json
{"jsonrpc":"2.0","id":1,"result":{"ok":true}}
```

## Example invocation

Request:

```json
{"id":"meta-1","tool":"soustack.meta","input":{}}
```

Response:

```json
{"id":"meta-1","ok":true,"output":{"mcpVersion":"0.1.0","soustackVersion":null,"specVersion":null,"supportedProfiles":["lite","base","timed","scalable","illustrated","equipped","prepped"],"timestamp":"2024-01-01T00:00:00.000Z"}}
```
