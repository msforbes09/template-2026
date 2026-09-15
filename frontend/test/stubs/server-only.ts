// Stand-in for the `server-only` package under Vitest.
//
// `import "server-only"` is a build-time marker: Next resolves it to a module
// that throws if a Client Component ever pulls it in. The package isn't
// actually installed here, so outside `next build` the import doesn't resolve
// and any server module that uses it fails to load. Aliased to this empty
// module in vitest.config.ts so those modules are importable in tests, with no
// effect on the real build.
export {};
