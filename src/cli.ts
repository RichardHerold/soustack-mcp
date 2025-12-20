#!/usr/bin/env node

import { startServer } from "./server.js";

startServer(process.stdin, process.stdout);
