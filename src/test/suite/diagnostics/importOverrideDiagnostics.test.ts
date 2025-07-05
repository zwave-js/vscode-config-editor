import * as assert from "node:assert";
import { parseConfigDocument } from "../../../configDocument";
import { generateImportOverrideDiagnostics } from "../../../diagnostics/importOverrideDiagnostics";

import * as vscode from "vscode";
import { getLanguageService as getJsonLanguageService } from "vscode-json-languageservice";
import { DiagnosticType } from "../../../diagnostics/diagnostics";
import { My } from "../../../my";

suite("importOverrideDiagnostics", () => {
	const languageService = getJsonLanguageService({});

	async function setup(documentContent: object) {
		const document = await vscode.workspace.openTextDocument({
			language: "JSON",
			content: JSON.stringify(documentContent),
		});

		return parseConfigDocument({ ls: languageService } as My, document);
	}

	suite("generateImportOverrideDiagnostics", () => {
		test("returns an importOverride if a property has been overridden with a differnt value", async () => {
			const documentContent = {
				test_template: {
					test: 1,
				},
				paramInformation: [
					{
						"#": 1,
						$import: "#test_template",
						test: 2,
					},
				],
			};

			const document = await setup(documentContent);

			const result = generateImportOverrideDiagnostics(document);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(
				result[0].type,
				DiagnosticType.ImportOverride,
				"Incorrect Diagnostic Type",
			);
		});

		test("returns an importOverride if an options property has been overridden with a different value", async () => {
			const documentContent = {
				test_template: {
					options: [
						{
							test: 1,
						},
					],
				},
				paramInformation: [
					{
						"#": 1,
						$import: "#test_template",
						options: [
							{
								test: 2,
							},
						],
					},
				],
			};

			const document = await setup(documentContent);

			const result = generateImportOverrideDiagnostics(document);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(
				result[0].type,
				DiagnosticType.ImportOverride,
				"Incorrect Diagnostic Type",
			);
		});

		test("returns an unnescessaryImportOverride if a property has been overridden with the same value", async () => {
			const documentContent = {
				test_template: {
					test: 1,
				},
				paramInformation: [
					{
						"#": 1,
						$import: "#test_template",
						test: 1,
					},
				],
			};

			const document = await setup(documentContent);

			const result = generateImportOverrideDiagnostics(document);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(
				result[0].type,
				DiagnosticType.UnnecessaryImportOverride,
				"Incorrect Diagnostic Type",
			);
		});

		test("returns an unnescessaryImportOverride if an options property has been overridden with the same value", async () => {
			const documentContent = {
				test_template: {
					options: [
						{
							test: 1,
						},
					],
				},
				paramInformation: [
					{
						"#": 1,
						$import: "#test_template",
						options: [
							{
								test: 1,
							},
						],
					},
				],
			};

			const document = await setup(documentContent);

			const result = generateImportOverrideDiagnostics(document);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(
				result[0].type,
				DiagnosticType.UnnecessaryImportOverride,
				"Incorrect Diagnostic Type",
			);
		});
	});
});
