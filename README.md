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
