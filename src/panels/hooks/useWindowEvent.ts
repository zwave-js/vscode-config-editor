import React from "react";

export function useWindowEvent<K extends keyof WindowEventMap>(
	type: K,
	listener: (this: Window, ev: WindowEventMap[K]) => any,
	options?: boolean | AddEventListenerOptions,
): void {
	React.useEffect(() => {
		window.addEventListener(type, listener, options);
		return () => window.removeEventListener(type, listener, options);
	}, [listener, options, type]);
}
