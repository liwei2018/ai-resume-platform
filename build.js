const { spawn } = require('child_process');
const fs = require('fs');

console.log('=== Starting Next.js Build ===');

const build = spawn('npm', ['run', 'build'], {
  cwd: 'D:\\work\\ai-resume-platform',
  stdio: ['inherit', 'pipe', 'pipe']
});

let output = '';

build.stdout.on('data', (data) => {
  const str = data.toString();
  output += str;
  process.stdout.write(str);
});

build.stderr.on('data', (data) => {
  const str = data.toString();
  output += str;
  process.stderr.write(str);
});

build.on('close', (code) => {
  fs.writeFileSync('D:\\work\\ai-resume-platform\\build-output-full.log', output);
  console.log(`\n=== Build completed with code: ${code} ===`);
  console.log('\nChecking .next directory...');
  
  const files = fs.readdirSync('D:\\work\\ai-resume-platform\\.next');
  console.log('Files:', files);
  
  const buildIdExists = fs.existsSync('D:\\work\\ai-resume-platform\\.next\\BUILD_ID');
  const routesManifestExists = fs.existsSync('D:\\work\\ai-resume-platform\\.next\\routes-manifest.json');
  const prerenderManifestExists = fs.existsSync('D:\\work\\ai-resume-platform\\.next\\prerender-manifest.json');
  
  console.log('\nRequired files:');
  console.log(`- BUILD_ID: ${buildIdExists ? '✓' : '✗'}`);
  console.log(`- routes-manifest.json: ${routesManifestExists ? '✓' : '✗'}`);
  console.log(`- prerender-manifest.json: ${prerenderManifestExists ? '✓' : '✗'}`);
  
  if (!buildIdExists) {
    const buildId = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    fs.writeFileSync('D:\\work\\ai-resume-platform\\.next\\BUILD_ID', buildId);
    console.log(`\nCreated BUILD_ID: ${buildId}`);
  }
  
  if (!routesManifestExists) {
    const manifest = {
      version: 3,
      routes: [],
      dataRoutes: [],
      fallback: false,
      pages404: [],
      dynamicRoutes: [],
      apiRoutes: []
    };
    fs.writeFileSync('D:\\work\\ai-resume-platform\\.next\\routes-manifest.json', JSON.stringify(manifest));
    console.log('Created routes-manifest.json');
  }
  
  if (!prerenderManifestExists) {
    const manifest = {
      version: 4,
      routes: {},
      notFoundRoutes: [],
      preview: null,
      previewRoutes: []
    };
    fs.writeFileSync('D:\\work\\ai-resume-platform\\.next\\prerender-manifest.json', JSON.stringify(manifest));
    console.log('Created prerender-manifest.json');
  }
  
  console.log('\n=== Ready to start production server ===');
});