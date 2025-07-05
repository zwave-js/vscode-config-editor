import assert from "node:assert";
import {
	ArrayASTNode,
	ASTNode,
	ObjectASTNode,
} from "vscode-json-languageservice";
import { isJSONDifferentToAST } from "../../astUtils";

suite("astUtils", () => {
	suite("isJSONDifferentToAST", () => {
		test("returns false if primitive values match", () => {
			const ast = {
				type: "number",
				value: 5,
			} as ASTNode;

			const json = 5;

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, false);
		});

		test("returns true if AST is a number type and json is string", () => {
			const ast = {
				type: "number",
				value: 5,
			} as ASTNode;

			const json = "5";

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});

		test("returns true if AST is object type and json is array", () => {
			const ast = {
				type: "object",
				properties: [
					{
						type: "property",
						keyNode: {
							type: "string",
							value: "test",
						},
						valueNode: {
							type: "number",
							value: 5,
						},
					},
				],
			} as ObjectASTNode;

			const json = [5];

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});

		test("returns true if AST is array type and json is object", () => {
			const ast = {
				type: "array",
				items: [
					{
						type: "number",
						value: 5,
					},
				],
			} as ArrayASTNode;

			const json = { 0: 5 };

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});

		test("returns true if value in array is different", () => {
			const ast = {
				type: "array",
				items: [
					{
						type: "number",
						value: 5,
					},
				],
			} as ArrayASTNode;

			const json = [6];

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});

		test("returns true if ast array is longer than json array", () => {
			const ast = {
				type: "array",
				items: [
					{
						type: "number",
						value: 5,
					},
					{
						type: "number",
						value: 5,
					},
				],
			} as ArrayASTNode;

			const json = [5];

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});

		test("returns true if ast array is longer than json array", () => {
			const ast = {
				type: "array",
				items: [
					{
						type: "number",
						value: 5,
					},
				],
			} as ArrayASTNode;

			const json = [5, 5];

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});

		test("returns true if ast object has more properties than json object", () => {
			const ast = {
				type: "object",
				properties: [
					{
						type: "property",
						keyNode: {
							type: "string",
							value: "test",
						},
						valueNode: {
							type: "number",
							value: 5,
						},
					},
					{
						type: "property",
						keyNode: {
							type: "string",
							value: "test2",
						},
						valueNode: {
							type: "number",
							value: 5,
						},
					},
				],
			} as ObjectASTNode;

			const json = { test: 5 };

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});

		test("returns true if json object has more properties than ast object", () => {
			const ast = {
				type: "object",
				properties: [
					{
						type: "property",
						keyNode: {
							type: "string",
							value: "test",
						},
						valueNode: {
							type: "number",
							value: 5,
						},
					},
				],
			} as ObjectASTNode;

			const json = { test: 5, test2: 5 };

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});

		test("returns true if json object has different property to ast object", () => {
			const ast = {
				type: "object",
				properties: [
					{
						type: "property",
						keyNode: {
							type: "string",
							value: "test",
						},
						valueNode: {
							type: "number",
							value: 5,
						},
					},
				],
			} as ObjectASTNode;

			const json = { test2: 5 };

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});

		test("returns true if json object has different value to ast object", () => {
			const ast = {
				type: "object",
				properties: [
					{
						type: "property",
						keyNode: {
							type: "string",
							value: "test",
						},
						valueNode: {
							type: "number",
							value: 5,
						},
					},
				],
			} as ObjectASTNode;

			const json = { test: 6 };

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});

		test("returns false if complex json matches ast", () => {
			const ast = {
				items: [
					{
						properties: [
							{
								keyNode: {
									type: "string",
									value: "test",
								},
								type: "property",
								valueNode: {
									type: "number",
									value: 1,
								},
							},
							{
								keyNode: {
									type: "string",
									value: "test2",
								},
								type: "property",
								valueNode: {
									type: "array",
									items: [
										{
											type: "object",
											properties: [
												{
													keyNode: {
														type: "string",
														value: "innerTest",
													},
													type: "property",
													valueNode: {
														type: "boolean",
														value: false,
													},
												},
											],
										},
									],
								},
							},
						],
						type: "object",
					},
				],
				type: "array",
			} as ASTNode;

			const json = [
				{
					test: 1,
					test2: [
						{
							innerTest: false,
						},
					],
				},
			];

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, false);
		});

		test("returns true if complex json differs from ast", () => {
			const ast = {
				items: [
					{
						properties: [
							{
								keyNode: {
									type: "string",
									value: "test",
								},
								type: "property",
								valueNode: {
									type: "number",
									value: 1,
								},
							},
							{
								keyNode: {
									type: "string",
									value: "test2",
								},
								type: "property",
								valueNode: {
									type: "array",
									items: [
										{
											type: "object",
											properties: [
												{
													keyNode: {
														type: "string",
														value: "innerTest",
													},
													type: "property",
													valueNode: {
														type: "boolean",
														// difference here
														value: true,
													},
												},
											],
										},
									],
								},
							},
						],
						type: "object",
					},
				],
				type: "array",
			} as ASTNode;

			const json = [
				{
					test: 1,
					test2: [
						{
							innerTest: false,
						},
					],
				},
			];

			const result = isJSONDifferentToAST(json, ast);

			assert.strictEqual(result, true);
		});
	});
});
