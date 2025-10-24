import prettierPluginOrganizeImports from "prettier-plugin-organize-imports";

export default {
	semi: true,
	trailingComma: "all",
	singleQuote: false,
	printWidth: 80,
	useTabs: true,
	tabWidth: 4,
	endOfLine: "lf",

	plugins: [prettierPluginOrganizeImports],

	overrides: [
		{
			files: "packages/config/**/*.json",
			options: {
				printWidth: 120,
			},
		},
		{
			files: "*.yml",
			options: {
				useTabs: false,
				tabWidth: 2,
				singleQuote: true,
			},
		},
	],
};
