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

// ────────────────────────────────────────────────────────────────────────────
// addFormToken(event)
// ---------------------------------------------------------------------------
// Call this from a server load function (e.g. +page.server.ts / +layout.server.ts)
// Sets a cryptographically-random cookie scoped to the current pathname
// and returns { token } so your page can optionally embed it in a hidden <input>
// (e.g. <input type="hidden" name="once" value={data.token} />)
// ────────────────────────────────────────────────────────────────────────────

const COOKIE = 'form_once';
const COOKIE_MAX_AGE_SECONDS = 600;

type CookieEvent = Pick<ServerLoadEvent, 'cookies' | 'url'> & { cookies: Cookies };

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

const running = new Map<string, Promise<unknown>>();

export function onceAction<T>(
    handler: (event: RequestEvent) => Promise<T>
): (event: RequestEvent) => Promise<T> {
    return async function wrapped(event: RequestEvent): Promise<T> {
        const token = event.cookies.get(COOKIE);

        if (!token) {
            // Return a typed ActionFailure if the token is missing
            return fail(400, { message: 'Form token missing' }) as unknown as T;
        }

        // Just wait for the existing job if duplicate
        const inFlight = running.get(token) as Promise<T> | undefined;
        if (inFlight) return inFlight;

        // Run the handler if first request
        const job = handler(event).finally(() => running.delete(token));
        running.set(token, job as unknown as Promise<unknown>);
        return job;
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
