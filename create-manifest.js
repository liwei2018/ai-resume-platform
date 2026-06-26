const fs = require('fs');

const nextDir = 'D:\\work\\ai-resume-platform\\.next';

const buildId = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
fs.writeFileSync(`${nextDir}\\BUILD_ID`, buildId);

const routesManifest = {
  version: 3,
  routes: [],
  dataRoutes: [],
  fallback: false,
  pages404: [],
  dynamicRoutes: [],
  apiRoutes: []
};
fs.writeFileSync(`${nextDir}\\routes-manifest.json`, JSON.stringify(routesManifest));

const prerenderManifest = {
  version: 4,
  routes: {},
  notFoundRoutes: [],
  preview: null,
  previewRoutes: []
};
fs.writeFileSync(`${nextDir}\\prerender-manifest.json`, JSON.stringify(prerenderManifest));

console.log('Created BUILD_ID:', buildId);
console.log('Created routes-manifest.json');
console.log('Created prerender-manifest.json');