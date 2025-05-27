# onceForm — server-side single-submission tokens for SvelteKit

[onceForm](/src/lib/onceForm.ts) is a minimal utility that guarantees a SvelteKit action is executed *at most once* per form submission, even when users double-click, refresh, or the browser retries a request. It relies entirely on server-side logic so no client-side JavaScript is required.

A demonstration can be viewed at:
<https://sveltekit-onceform.vercel.app/login>

---

## Contents

- [Key capabilities](#key-capabilities)  
- [Installation and basic usage](#installation-and-basic-usage)  
- [API reference](#api-reference)  
- [Internal workflow](#internal-workflow)  
- [Scaling considerations](#scaling-considerations)  
- [Contributing](#contributing)  
- [License](#license)

---

## Key capabilities

| Feature | Description |
|---------|-------------|
| **One-time execution** | Duplicate requests with the same token wait for the first execution and receive the identical response. |
| **No persistent storage** | Uses an in-memory `Map` (Swap in Redis or another store for horizontal scaling). |
| **Typed results** | The original action’s return type is preserved, including `fail`, `redirect`, and custom objects. |
| **Cryptographically strong tokens** | Tokens are generated with `crypto.randomUUID()` and stored in an `HttpOnly` cookie limited to the current route. |
| **Small footprint** | One self-contained TypeScript file, no runtime dependencies. |

---

## Installation and basic usage

1. Copy the library file:

```bash
# adjust the path as required
mkdir -p src/lib
curl -o src/lib/onceForm.ts \
  https://raw.githubusercontent.com/psykano/sveltekit-onceform/main/src/lib/onceForm.ts
```

2. Add a token in the `load` function of `+page.server.ts`:

```ts
import { addFormToken } from '$lib/onceForm';

export const load = (event) => addFormToken(event);
```

Optionally, embed the token in the `form` of `+page.svelte`:

```svelte
<form>
    <input type="hidden" name="once" value={data.token} />
```

3. Wrap the action with `onceAction` in `+page.server.ts`:

```ts
import { addFormToken, onceAction, kitRedirect } from '$lib/onceForm';
import { fail } from '@sveltejs/kit';

export const load = (event) => addFormToken(event);

export const actions = {
  default: onceAction(async ({ request }) => {
    const formData = await request.formData();

    // Perform work with the form data that must not repeat

    // Handle any errors
    if (errors) {
      return fail(400, ... });
    }

    // Redirect upon success
    return kitRedirect('/dashboard');
  })
};
```

The wrapped action executes exactly once for each valid token. Subsequent requests with the same token block until the first completes and reuse its result.

---

## API reference

#### `addFormToken(event, data?)`
Generates a secure token and adds it to page data.

**Parameters:**
- `event`: SvelteKit server load event
- `data`: Optional existing data to merge with token

**Returns:** `{ ...data, token: string }`

#### `onceAction(handler)`
Wraps your action to ensure single execution per token.

**Parameters:**
- `handler`: Your SvelteKit action function

**Returns:** Wrapped action that prevents duplicate execution

#### `kitRedirect(path)`
Convenience helper for redirects within actions.

**Parameters:**
- `path`: The URL path to redirect to

**Returns:** `never` (throws a SvelteKit redirect)

---

## Internal workflow

1. **Token creation**
   
   `addFormToken` writes `Set-Cookie: form_once=<uuid>; Path=/current/route; Max-Age=600; HttpOnly`.

2. **Request handling**
   
   `onceAction` inspects the cookie:

   * No token → `fail(400)` (“Form token missing”).
   * New token → executes the handler, stores the resulting `Promise` in a module-level `Map`, and removes it on completion.
   * Duplicate token → returns the stored `Promise`.

    Because each duplicate returns the *same* promise, SvelteKit receives an identical response including status code, headers, and body.

---

## Scaling considerations

The default implementation keeps the `running` map in memory, which is sufficient for a single Node process. To scale, replace the `running` map with a distributed store (e.g., Redis, Memcached).

---

## Contributing

Contributions are welcome. Please maintain the existing coding style and keep the library dependency-free.

---

## License

`onceForm` is distributed under the MIT License (see `LICENSE`).

© 2025 Chris Johns