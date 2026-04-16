const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all workspace files
config.watchFolders = [workspaceRoot];

// Resolve modules from both the mobile package and the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Force Metro to resolve these packages from mobile's own node_modules first
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
