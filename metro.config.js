const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// WatermelonDB requires mjs/cjs resolution
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// El dashboard web (Next.js) vive en el mismo repo pero no es parte del bundle móvil.
const dashboardDir = path.join(__dirname, 'dashboard').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [].concat(config.resolver.blockList ?? [], new RegExp(`^${dashboardDir}[\\/\\\\].*`));

module.exports = config;
