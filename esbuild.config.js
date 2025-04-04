import * as build from 'esbuild';
import { copy } from 'esbuild-plugin-copy';

const watchMode = process.argv.includes('--watch');

// Create build context
const context = await build.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  sourcemap: true,
  platform: 'browser',
  target: 'es2018',
  minify: !watchMode,
  format: 'esm',
  logLevel: 'info',
  loader: {
    '.html': 'text',
    '.svg': 'file',
    '.png': 'file',
    '.jpg': 'file',
  },
  plugins: [
    copy({
      assets: [
        {
          from: ['./src/index.html'],
          to: ['./'],
        },
        {
          from: ['./src/styles/**/*'],
          to: ['./'],
        },
      ],
      watch: true,
    }),
  ]
});

// Build once
const result = await context.rebuild();
console.log('Build completed successfully!');

// Watch for changes and start dev server if in watch mode
if (watchMode) {
  // Start watching
  await context.watch();
  console.log('Watching for changes...');

  // Start dev server
  const serveResults = await context.serve({
    port: 3000,
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
