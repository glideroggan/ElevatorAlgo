import * as build from 'esbuild';
import { copy } from 'esbuild-plugin-copy';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProduction = process.env.NODE_ENV === 'production';
const isWatch = process.argv.includes('--watch');

// Ensure the dist directory exists
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  fs.mkdirSync(path.join(__dirname, 'dist'));
}

// Ensure the algorithms directory exists in dist
if (!fs.existsSync(path.join(__dirname, 'dist', 'algorithms'))) {
  fs.mkdirSync(path.join(__dirname, 'dist', 'algorithms'), { recursive: true });
}

const context = await build.context({
  entryPoints: [
    'src/index.ts',
    'src/algorithms/scripts/example.ts',
    'src/algorithms/BaseElevatorAlgorithm.ts',
    'src/algorithms/IElevatorAlgorithm.ts',
  ],
  bundle: true,
  treeShaking: true,
  outdir: 'dist', // Change from outfile to outdir since we have multiple outputs
  minify: isProduction,
  sourcemap: !isProduction,
  platform: 'browser',
  target: ['es2020'],
  format: 'esm',
  loader: { 
    '.ts': 'ts', 
    '.js': 'js',
    '.css': 'text',
    '.html': 'text'
  },
  external: ['@elevator-base', '@elevator-interfaces'],
  plugins: [
    copy({
      assets: [
        { from: ['src/index.html'], to: ['index.html'] },
        { from: ['src/styles/*.css'], to: ['styles.css'] },
        { from: ['src/algorithms/scripts/example.ts'], to: ['example.ts'] },
        // Add TypeScript definition files explicitly
        { from: ['src/algorithms/BaseElevatorAlgorithm.ts'], to: ['algorithms/BaseElevatorAlgorithm.d.ts'] },
        { from: ['src/algorithms/IElevatorAlgorithm.ts'], to: ['algorithms/IElevatorAlgorithm.d.ts'] }
      ]
    })
  ],
});

// Build once
const result = await context.rebuild();
console.log('Build completed successfully!', isProduction ? 'Production mode' : 'Development mode');

// Watch for changes and start dev server if in watch mode
if (isWatch) {
  // Start watching
  await context.watch();
  console.log('Watching for changes...');

  // Start dev server
  const serveResults = await context.serve({
    port: 3001,
    servedir: 'dist',
    onRequest: args => {
      console.log(`${args.method} [${args.path}] ${args.status} (${args.timeInMS}ms)`);
    }
  });

  console.log(`Server started at http://localhost:${serveResults.port}`);

  // Wait indefinitely until user presses Ctrl+C
  const wait = async () => {
    return new Promise(resolve => {
      // This handler will be triggered when the process is interrupted (e.g., Ctrl+C)
      process.on('SIGINT', () => {
        console.log('Interrupted by user');
        resolve();
      });
    });
  };

  await wait();
  await context.dispose();
} else {
  // Just build once and exit
  await context.dispose();
}
