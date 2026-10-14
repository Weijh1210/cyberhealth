import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default [
 {ignores:['.next/**','node_modules/**','playwright-report/**','test-results/**','next-env.d.ts']},
 js.configs.recommended,
 ...tseslint.configs.recommended,
 {files:['**/*.{ts,tsx}'],rules:{'no-undef':'off','@typescript-eslint/no-explicit-any':'off','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}},
 {files:['public/sw.js'],languageOptions:{globals:{self:'readonly',caches:'readonly',fetch:'readonly',URL:'readonly',Response:'readonly'}}},
];
