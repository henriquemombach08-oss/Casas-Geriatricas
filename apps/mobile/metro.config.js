const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Only watch the mobile app source and workspace node_modules — not the entire monorepo
config.watchFolders = [
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(projectRoot, 'app'),
  path.resolve(projectRoot, 'src'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

// Block deeply-nested pnpm internal node_modules to prevent OOM
config.resolver.blockList = [
  /.*[/\\]\.pnpm[/\\].*[/\\]node_modules[/\\].*[/\\]node_modules[/\\].*/,
  /.*[/\\]apps[/\\]api[/\\].*/,
  /.*[/\\]apps[/\\]web[/\\].*/,
];

module.exports = config;
