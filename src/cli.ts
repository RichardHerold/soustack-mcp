#!/usr/bin/env node

import { startServer } from "./server";

startServer(process.stdin, process.stdout);
