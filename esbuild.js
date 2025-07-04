// Based on https://github.com/microsoft/vscode-webview-ui-toolkit/blob/HEAD/docs/getting-started.md
// This may require changes when upgrading to esbuild 0.17+

const { build } = require("esbuild");
const glob = require("glob");

const baseConfig = {
	bundle: true,
	minify: process.env.NODE_ENV === "production",
	sourcemap: process.env.NODE_ENV !== "production",
};

const testFiles = process.env.NODE_ENV !== "production" ? glob.sync("./src/test/**/*.ts") : [];

const extensionConfig = {
	...baseConfig,
	platform: "node",
	mainFields: ["module", "main"],
	format: "cjs",
	entryPoints: ["./src/extension.ts", ...testFiles],
	outdir: "./out",
	external: ["vscode"],
};

const webviewConfig = {
	...baseConfig,
	target: "es2020",
	format: "esm",
	entryPoints: ["./src/panels/components/root.tsx"],
	outfile: "./out/webview-root.js",
};

const watchConfig = {
	watch: {
		onRebuild(error, result) {
			console.log("[watch] build started");
			if (error) {
				error.errors.forEach((error) =>
					console.error(
						`> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`,
					),
				);
			} else {
				console.log("[watch] build finished");
			}
		},
	},
};

void (async () => {
	const args = process.argv.slice(2);
	try {
		if (args.includes("--watch")) {
			// Build and watch source code
			console.log("[watch] build started");
			await build({
				...extensionConfig,
				...watchConfig,
			});
			await build({
				...webviewConfig,
				...watchConfig,
			});
			console.log("[watch] build finished");
		} else {
			// Build source code
			await build(extensionConfig);
			await build(webviewConfig);
			console.log("build complete");
		}
	} catch (err) {
		process.stderr.write(err.stderr);
		process.exit(1);
	}
})();
