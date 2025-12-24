#!/usr/bin/env node

import * as child_process from 'node:child_process';

// Check if exec returns a promise when called with one argument
const execResult = child_process.exec('echo hello');
console.log('Type of exec result:', typeof execResult);
console.log('Is exec a Promise?', execResult instanceof Promise);
