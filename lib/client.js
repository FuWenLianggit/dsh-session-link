window.__ModuleLoader__.load({
	id: "dsh-session-link",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		// src/client/index.tsx
		/**
		* dsh-session-link client half (dsh 0.2 runtime).
		*
		* Two behaviors:
		* 1. A header action on every conversation that copies a deep link to the
		*    current session: `<origin>/?session=<sessionId>`.
		* 2. On boot, if the URL carries `?session=<id>`, select that session through
		*    the current navigation seam (`uiWorkspace.openSession`), retrying briefly
		*    because the session catalog may not have loaded when this plugin applies.
		*
		* Written against the 0.2 client contract: slots.register returns its disposer
		* (there is no `slots.inject` any more) and `sessions.open` was replaced by
		* `uiWorkspace.openSession`. Everything is resolved structurally through
		* `ctx.get`, so the bundle needs no Harness package imports.
		*/
		const name = "session-link";
		/** The title-adjacent header action strip. */
		const HEADER_ACTIONS = "conversation.session.header.actions";
		/** Bounded retry budget for the deep-link opener (~10s at 200ms). */
		const OPEN_ATTEMPTS = 50;
		const OPEN_RETRY_MS = 200;
		/** Canonical browser link to one session. */
		function sessionLinkOf(sessionId) {
			return `${globalThis.location.origin}/?session=${encodeURIComponent(sessionId)}`;
		}
		/** Copy text, falling back to a hidden textarea on non-secure contexts. */
		async function copyText(text) {
			try {
				await navigator.clipboard.writeText(text);
				return;
			} catch {}
			const textarea = document.createElement("textarea");
			textarea.value = text;
			textarea.style.position = "fixed";
			textarea.style.opacity = "0";
			document.body.appendChild(textarea);
			textarea.select();
			try {
				document.execCommand("copy");
			} catch {}
			textarea.remove();
		}
		function CopySessionLink({ sessionId }) {
			const [copied, setCopied] = (0, react.useState)(false);
			const timerRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => () => {
				if (timerRef.current !== void 0) globalThis.clearTimeout(timerRef.current);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					copyText(sessionLinkOf(sessionId)).then(() => {
						setCopied(true);
						if (timerRef.current !== void 0) globalThis.clearTimeout(timerRef.current);
						timerRef.current = globalThis.setTimeout(() => setCopied(false), 1500);
					});
				},
				title: copied ? "已复制会话链接" : "复制会话链接",
				"aria-label": copied ? "已复制会话链接" : "复制会话链接",
				style: {
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					width: "24px",
					height: "24px",
					background: "transparent",
					border: "none",
					cursor: "pointer",
					padding: 0,
					borderRadius: "999px",
					color: copied ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-label-tertiary)",
					fontSize: "14px",
					lineHeight: 1
				},
				children: copied ? "✓" : "🔗"
			});
		}
		/**
		* Select the session named by `?session=<id>` once navigation can accept it.
		* `openSession` throws while the target is unknown, so the retry is bounded.
		*/
		function openSessionFromLocation(scope, uiWorkspace) {
			const target = new URLSearchParams(globalThis.location.search).get("session");
			if (target === null || target.length === 0) return;
			scope.effect(() => {
				let attempts = 0;
				let timer;
				let done = false;
				const attempt = () => {
					if (done) return;
					attempts += 1;
					try {
						uiWorkspace.openSession(target);
						done = true;
						return;
					} catch {}
					if (attempts >= OPEN_ATTEMPTS) {
						console.warn(`dsh-session-link: session "${target}" never appeared in the catalog`);
						done = true;
						return;
					}
					timer = globalThis.setTimeout(attempt, OPEN_RETRY_MS);
				};
				attempt();
				return () => {
					done = true;
					if (timer !== void 0) globalThis.clearTimeout(timer);
				};
			}, "session-link: open session from URL");
		}
		function apply(ctx) {
			ctx.inject(["uiWorkspace"], (scope) => {
				openSessionFromLocation(scope, scope.get("uiWorkspace"));
			});
			ctx.inject(["slots"], (scope) => {
				scope.effect(() => scope.get("slots").register({
					name: HEADER_ACTIONS,
					id: "copy-session-link",
					order: 25
				}, CopySessionLink), "session-link: copy-link header action");
			});
		}
		exports.apply = apply;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map