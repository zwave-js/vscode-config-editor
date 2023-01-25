import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../assets/style.css";
import { useWindowEvent } from "../hooks/useWindowEvent";
import { IPCMessage, IPCMessage_Ready } from "../shared/protocol";
import { ParamPreview } from "./paramPreview";

const vscode = acquireVsCodeApi();

const Root: React.FC = () => {
	const [paramPreview, setParamPreview] = useState<ParamPreview>();

	// const [lastCallbackId, setLastCallbackId] = useState(0);

	// Notify the extension that the webview is ready to receive messages
	React.useEffect(() => {
		vscode.postMessage({
			command: "ready",
		} satisfies IPCMessage_Ready);
	}, []);

	useWindowEvent("message", (event: MessageEvent<IPCMessage>) => {
		if (event.data.command === "renderParam") {
			setParamPreview({
				param: event.data.param,
				overwrittenProperties: event.data.overwrittenProperties,
			});
		}
	});

	return (
		<>
			<ParamPreview {...paramPreview} />
		</>
	);
};

const root = createRoot(document.getElementById("root")!);
root.render(<Root />);
