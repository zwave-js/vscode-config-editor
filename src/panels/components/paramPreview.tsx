import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import { IPCMessage_RenderParam } from "../shared/protocol";
import { ParamOptions } from "./paramOptions";

export type ParamPreview = Pick<
	IPCMessage_RenderParam,
	"param" | "overwrittenProperties"
>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ParamPreviewProps extends Partial<ParamPreview> {}

export const ParamPreview: React.FC<ParamPreviewProps> = ({
	param,
	// overwrittenProperties,
}) => {
	if (!param) {
		return <div className="param-preview">No parameter selected</div>;
	}

	const isDropdown = param.allowManualEntry === false;

	return (
		<div className="param-preview">
			<div className="param-preview__number">#{param["#"]}</div>
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
			<div className="param-preview__size">
				<VSCodeTag>
					{param.valueSize} byte{param.valueSize !== 1 && "s"}
				</VSCodeTag>
			</div>

			<div className="param-preview__details">
				{isDropdown && <ParamOptions options={param.options ?? []} />}
				<code>
					<pre>{JSON.stringify(param, null, 2)}</pre>
				</code>
			</div>
		</div>
	);
};
