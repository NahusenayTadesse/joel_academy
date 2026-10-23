/**
 * Packs `build/` into `build.tar.gz` for the cPanel server, next to a `package.json` the server can
 * actually install from. Runs as the second half of `npm run build`.
 *
 * The real `package.json` cannot go up as is: `@nahu/admin-kit` is `file:../admin-kit`, a folder
 * that only exists on this machine, and npm on the server dies on it with "Cannot read properties
 * of null (reading 'edgesOut')". The kit is a devDependency, so adapter-node bundles it into
 * `build/` and the server never needs it. The shipped `package.json` keeps only `dependencies`
 * (what `build/` still imports at runtime) and a `start` script; no `prepare`, which would need
 * svelte-kit on the server.
 *
 * Unpack the tarball in the application root, then "Run NPM Install" and restart in cPanel.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const local = Object.entries(pkg.dependencies ?? {}).filter(([, spec]) => /^(file|link):/.test(spec));
if (local.length) {
	console.error(
		`These dependencies point at folders on this machine and would break npm on the server:\n` +
			local.map(([name, spec]) => `  ${name}: ${spec}`).join('\n') +
			`\nMove them to devDependencies so they are bundled into build/.`
	);
	process.exit(1);
}

const deploy = {
	name: pkg.name,
	version: pkg.version,
	private: true,
	type: pkg.type,
	scripts: { start: 'node build' },
	dependencies: pkg.dependencies
};

fs.rmSync('.deploy', { recursive: true, force: true });
fs.mkdirSync('.deploy');
fs.writeFileSync('.deploy/package.json', JSON.stringify(deploy, null, 2) + '\n');

execFileSync('tar', ['-czf', 'build.tar.gz', 'build', '-C', '.deploy', 'package.json'], {
	stdio: 'inherit'
});
console.log('build.tar.gz: build/ + server package.json');
