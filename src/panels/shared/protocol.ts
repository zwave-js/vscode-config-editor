export interface IPCMessageBase {
	_id?: number;
	command: string;
}

export interface IPCMessage_SetText extends IPCMessageBase {
	command: "setText";
	text: string;
}

export type IPCMessage = IPCMessage_SetText;

export type IPCMessageCallback = (message: IPCMessage) => void;
