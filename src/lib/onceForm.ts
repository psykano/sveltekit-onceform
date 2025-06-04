// ════════════════════════════════════════════════════════════════════════════
// One-shot form token + “run-once” action wrapper
// - No client-side JavaScript required
// - No extra DB table: pure in-memory lock (swap to Redis if you scale)
// - Generic: your action’s own return type is preserved
// ════════════════════════════════════════════════════════════════════════════

import {
    fail,
    redirect,
    type Cookies,
    type ServerLoadEvent,
    type RequestEvent
} from '@sveltejs/kit';
import type { CookieSerializeOptions } from 'cookie';

// ────────────────────────────────────────────────────────────────────────────
// Configuration & in-memory state
// ---------------------------------------------------------------------------
// - COOKIE: name of the lock token cookie
// - COOKIE_MAX_AGE_SECONDS: lifespan of that cookie
// - CookieOpts: cookie-serialize options (must include path)
// - CookieOp / RunningJob: capture and replay Set-Cookie side-effects
// - running: in-memory map of { token -> { promise, ops } }
// ────────────────────────────────────────────────────────────────────────────

const COOKIE = 'form_once';
const COOKIE_MAX_AGE_SECONDS = 600;

type CookieOpts = CookieSerializeOptions & { path: string };
type CookieOp = [name: string, value: string, opts: CookieOpts];

interface RunningJob<T> {
    promise: Promise<T>;
    ops: CookieOp[];
}

const running = new Map<string, RunningJob<unknown>>();

type CookieEvent = Pick<ServerLoadEvent, 'cookies' | 'url'> & { cookies: Cookies };

// ────────────────────────────────────────────────────────────────────────────
// addFormToken(event)
// ---------------------------------------------------------------------------
// Call this from a server load function (e.g. +page.server.ts / +layout.server.ts)
// Sets a cryptographically-random cookie scoped to the current pathname
// and returns { token } so your page can optionally embed it in a hidden <input>
// (e.g. <input type="hidden" name="once" value={data.token} />)
// ────────────────────────────────────────────────────────────────────────────
export function addFormToken<T extends Record<string, unknown> = {}>(
    event: CookieEvent,
    data: T = {} as T
) {
    const token = crypto.randomUUID();
    event.cookies.set(COOKIE, token, {
        httpOnly: true,
        maxAge: COOKIE_MAX_AGE_SECONDS,
        path: event.url.pathname
    });
    return { ...data, token };
}

// ────────────────────────────────────────────────────────────────────────────
// onceAction(handler)
// ---------------------------------------------------------------------------
// Wrap your action so handler runs exactly once per token.
// All duplicate requests with the same token await the first Promise and
// return the same SvelteKit response (fail / redirect / anything).
// ────────────────────────────────────────────────────────────────────────────
export function onceAction<T>(
    handler: (event: RequestEvent) => Promise<T>
): (event: RequestEvent) => Promise<T> {
    return async function wrapped(event: RequestEvent): Promise<T> {
        const token = event.cookies.get(COOKIE);

        // Return a typed ActionFailure if the token is missing
        if (!token) {
            return fail(400, { message: 'Form token missing' }) as unknown as T;
        }

        // Just wait for the existing job if duplicate
        const existing = running.get(token) as RunningJob<T> | undefined;
        if (existing) {
            try {
                const result = await existing.promise;
                for (const [name, value, opts] of existing.ops) {
                    event.cookies.set(name, value, opts);
                }
                return result;
            } catch (err) {
                for (const [name, value, opts] of existing.ops) {
                    event.cookies.set(name, value, opts);
                }
                throw err;
            }
        }

        // Run the handler if first request and store any cookies
        const ops: CookieOp[] = [];

        const originalSet = event.cookies.set.bind(event.cookies);
        event.cookies.set = ((name, value, options) => {
            ops.push([name, value, options as CookieOpts]);
            originalSet(name, value, options);
        }) as typeof event.cookies.set;

        const promise = handler(event).finally(() => running.delete(token));
        running.set(token, { promise, ops });

        return promise;
    };
}

// ────────────────────────────────────────────────────────────────────────────
// kitRedirect(path)
// ---------------------------------------------------------------------------
// Convenience helper: call inside your handler instead of redirect(303, …)
// ────────────────────────────────────────────────────────────────────────────
export function kitRedirect(path: string): never {
    throw redirect(303, path);
}
