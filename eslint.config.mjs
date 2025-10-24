import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
	// Global ignores
	{
		ignores: [
			"build/",
			"node_modules/",
			"out/",
			"dist/",
			"src/test/",
			"**/*.d.ts",
			"esbuild.js",
		],
	},

	// TypeScript files configuration
	tseslint.configs.recommendedTypeChecked,
	{
		// extends: [tseslint.configs.recommendedTypeChecked],
		files: ["src/**/*.ts", "src/**/*.tsx"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: "error",
		},
		rules: {
			// TypeScript-specific rules
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					ignoreRestSiblings: true,
					argsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-inferrable-types": [
				"error",
				{
					ignoreProperties: true,
					ignoreParameters: true,
				},
			],
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{
					"ts-expect-error": false,
					"ts-ignore": true,
					"ts-nocheck": true,
					"ts-check": false,
				},
			],
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{
					allowNumber: true,
					allowBoolean: true,
					allowAny: true,
					allowNullish: true,
				},
			],
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksVoidReturn: false,
				},
			],

			// Disabled type-checking rules for performance/practicality
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-implied-eval": "off",

			"@typescript-eslint/explicit-module-boundary-types": [
				"warn",
				{ allowArgumentsExplicitlyTypedAsAny: true },
			],
			"@typescript-eslint/no-this-alias": "off",

			// Property access rules
			"dot-notation": "off",
			"@typescript-eslint/dot-notation": [
				"error",
				{
					allowPrivateClassPropertyAccess: true,
					allowProtectedClassPropertyAccess: true,
				},
			],
			"quote-props": ["error", "as-needed"],
		},
	},

	// Test files configuration
	{
		files: ["**/*.test.ts"],
		rules: {
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/no-unused-vars": "warn",
			"@typescript-eslint/dot-notation": "off",
		},
	},

	// JavaScript files configuration
	{
		files: ["**/*.js", "**/*.mjs"],
		...tseslint.configs.disableTypeChecked,
	},

	// Prettier must be last to override other configs
	eslintPluginPrettierRecommended,
);
