import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useWindowEvent } from "../hooks/useWindowEvent";
import { IPCMessage, IPCMessage_SetText } from "../shared/protocol";

const vscode = acquireVsCodeApi();

const Root: React.FC = () => {
	const [text, setText] = useState("Hello World");
	const [lastCallbackId, setLastCallbackId] = useState(0);

	const handleClick = React.useCallback(() => {
		vscode.postMessage({
			_id: lastCallbackId,
			command: "setText",
			text: "Hey there partner! 🤠",
		} satisfies IPCMessage_SetText);
	}, [lastCallbackId]);

	useWindowEvent("message", (event: MessageEvent<IPCMessage>) => {
		if (event.data.command === "setText") {
			setText(event.data.text);
			setLastCallbackId(event.data._id!);
		}
	});
	return (
		<>
			<VSCodeButton onClick={handleClick}>{text}</VSCodeButton>
		</>
	);
};

const root = createRoot(document.getElementById("root")!);
root.render(<Root />);
