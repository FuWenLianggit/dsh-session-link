window.__ModuleLoader__.load({
	id: "dsh-session-link",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/index.tsx
		/**
		* dsh-session-link client half.
		*
		* Two behaviors:
		* 1. A header action on every conversation that copies a deep link to the
		*    current session: `<origin>/?session=<sessionId>`.
		* 2. On boot, if the URL carries `?session=<id>`, select that session once it
		*    appears in the session list (retries briefly because the list may not be
		*    loaded when this plugin applies).
		*/
		const name = "session-link";
		function openWhenReady(sessions, id) {
			let attempts = 0;
			const tryOpen = () => {
				attempts += 1;
				try {
					sessions.open(id);
				} catch {
					if (attempts < 10) globalThis.setTimeout(tryOpen, 500);
				}
			};
			tryOpen();
		}
		function CopySessionLink(props) {
			const [copied, setCopied] = (0, react.useState)(false);
			const timerRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => () => {
				if (timerRef.current !== void 0) globalThis.clearTimeout(timerRef.current);
			}, []);
			const copy = async () => {
				const url = `${globalThis.location.origin}/?session=${encodeURIComponent(props.sessionId)}`;
				try {
					await navigator.clipboard.writeText(url);
				} catch {
					const textarea = document.createElement("textarea");
					textarea.value = url;
					textarea.style.position = "fixed";
					textarea.style.opacity = "0";
					document.body.appendChild(textarea);
					textarea.select();
					try {
						document.execCommand("copy");
					} catch {}
					textarea.remove();
				}
				setCopied(true);
				timerRef.current = globalThis.setTimeout(() => setCopied(false), 1500);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					copy();
				},
				title: copied ? "已复制会话链接" : "复制会话链接",
				"aria-label": copied ? "已复制会话链接" : "复制会话链接",
				style: {
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					background: "transparent",
					border: "none",
					cursor: "pointer",
					padding: "4px",
					borderRadius: "4px",
					fontSize: "14px",
					lineHeight: "1"
				},
				children: copied ? "✓" : "🔗"
			});
		}
		function apply(ctx) {
			const target = new URLSearchParams(globalThis.location.search).get("session");
			if (target !== null && target.length > 0) {
				const sessions = ctx.get("sessions");
				if (sessions !== void 0) openWhenReady(sessions, target);
			}
			const slots = ctx.get("slots");
			if (slots !== void 0) slots.inject("conversation.session.header.actions", () => slots.register({
				name: "conversation.session.header.actions",
				id: "copy-session-link",
				order: 25
			}, CopySessionLink));
		}
		//#endregion
		exports.apply = apply;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map