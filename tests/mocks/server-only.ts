// Vitest runs outside Next's RSC bundler, where the real `server-only` package's
// import-time throw doesn't make sense — aliased to this no-op in both vitest configs.
export {};
