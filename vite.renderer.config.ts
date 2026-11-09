import { defineConfig } from 'vite';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// https://vitejs.dev/config
export default defineConfig({
    define: {
        'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
    },
});
