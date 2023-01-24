export interface IPCMessageBase {
	_id?: number;
	command: string;
}

export interface IPCMessage_Ready extends IPCMessageBase {
	command: "ready";
}

export interface IPCMessage_RenderParam extends IPCMessageBase {
	command: "renderParam";
	param: Record<string, any> | undefined;
	overwrittenProperties: string[] | undefined;
}

export type IPCMessage = IPCMessage_Ready | IPCMessage_RenderParam;

export type IPCMessageCallback = (message: IPCMessage) => void;
