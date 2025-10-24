import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import { IPCMessage_RenderParam } from "../shared/protocol";
import { ParamOptions } from "./paramOptions";

export type ParamPreview = Pick<
	IPCMessage_RenderParam,
	"param" | "overwrittenProperties"
>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ParamPreviewProps extends Partial<ParamPreview> {}

const valueBitMaskRegex = /^(\d+)(?:\[(0x[0-9a-fA-F]+)\])?$/;

export const ParamPreview: React.FC<ParamPreviewProps> = ({
	param,
	// overwrittenProperties,
}) => {
	if (!param) {
		return <div className="param-preview empty">No parameter selected</div>;
	}

	const read = param.writeOnly !== true;
	const write = param.readOnly !== true;

	let paramNo: string = param["#"];
	let bitMask: string | undefined;
	const match = valueBitMaskRegex.exec(paramNo);
	if (match) {
		paramNo = match[1];
		bitMask = match[2];
	} else {
		// Avoid showing incomplete bitmasks
		paramNo = parseInt(paramNo).toString();
	}

	const unresolvedImport: string | undefined = param.$import;

	return (
		<div className="param-preview">
			<div className="param-preview__number">
				<span className="number">#{paramNo}</span>
				{bitMask && <VSCodeTag className="bitmask">partial</VSCodeTag>}
			</div>
			<div className="param-preview__header">
				<div className="param-preview__header__label">
					{param.label}
				</div>
				{param.description && (
					<div className="param-preview__header__description">
						{param.description}
					</div>
				)}
			</div>
			<div className="param-preview__RW">
				<VSCodeTag>
					{read && "read"}
					{read && write && " / "}
					{write && "write"}
				</VSCodeTag>
			</div>

			<div className="param-preview__details">
				{/* Show errors */}
				{unresolvedImport && (
					<>
						<span className="error">Error</span>
						<span className="error">
							Unresolved template import:
							<pre>{unresolvedImport}</pre>
						</span>
					</>
				)}

				{/* Partial parameters */}
				{bitMask && (
					<>
						<span>Bitmask</span>
						<code>{bitMask}</code>
					</>
				)}

				{/* Conditional parameters */}
				{param.$if && (
					<>
						<span>Condition</span>
						<code>{param.$if}</code>
					</>
				)}

				{/* Value size */}
				<span>Size</span>
				<span>
					{param.valueSize} byte{param.valueSize !== 1 && "s"}
					{param.unsigned ? " (unsigned)" : " (signed)"}
				</span>

				{/* Min/Max/Default */}
				{param.allowManualEntry !== false && (
					<>
						<span>Range</span>
						<span>
							{param.minValue} to {param.maxValue}
							{param.unit && ` ${param.unit}`}, default{" "}
							{param.defaultValue}
							{param.recommendedValue != undefined && (
								<>, recommended {param.recommendedValue}</>
							)}
						</span>
					</>
				)}

				{/* Options */}
				{(param.options?.length ||
					param.allowManualEntry === false) && (
					<>
						<span>
							{param.allowManualEntry === false
								? "Possible values"
								: "Predefined options"}
						</span>
						<ParamOptions
							options={param.options ?? []}
							defaultValue={param.defaultValue}
							recommendedValue={param.recommendedValue}
						/>
					</>
				)}
			</div>
		</div>
	);
};
