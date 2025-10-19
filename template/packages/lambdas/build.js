import { build } from 'esbuild';
import { glob } from 'glob';

const entryPoints = glob.sync('src/**/*.ts', {
  ignore: ['src/common/**'],
});

await build({
  entryPoints,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: 'dist',
  outbase: 'src',
  external: ['@aws-sdk/*'],
  minify: true,
  sourcemap: false,
});

console.log('Build complete!');
