<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';

    export let data: PageData;
    export let form: ActionData;

    let submitting = false;

    let user = form?.data?.user ?? '';
    let pass = form?.data?.password ?? '';

    // Keep bound values in sync with the server
    $: if (form?.data) {
        if (form.data.user !== undefined) user = form.data.user;
        if (form.data.password !== undefined) pass = form.data.password;
    }
</script>

<form
    method="POST"
    use:enhance={() => {
        submitting = true;

        return async ({ update }) => {
            await update();
            submitting = false;
        };
    }}
>
    <!-- Optional token -->
    <input type="hidden" name="once" value={data.token} />

    <input
        type="text"
        name="user"
        bind:value={user}
        autocomplete="username"
    />
    {#if form?.errors?.user}
        <p class="error">{form.errors.user}</p>
    {/if}

    <input
        type="password"
        name="password"
        bind:value={pass}
        autocomplete="current-password"
    />
    {#if form?.errors?.password}
        <p class="error">{form.errors.password}</p>
    {/if}

    <button type="submit" disabled={submitting} aria-busy={submitting}>
        {#if submitting}
            <span class="spinner" aria-hidden="true"></span>
            <span class="visually-hidden">Logging&nbsp;in…</span>
        {:else}
            Login
        {/if}
    </button>

    {#if form?.errors?.db}
        <p class="error">{form.errors.db}</p>
    {/if}
</form>

<style>
    form {
        max-width: 400px;
        margin: 2rem auto;
        padding: 2rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: #f9f9f9;
        font-family: system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    input {
        padding: 0.5rem;
        font-size: 1rem;
        border: 1px solid #bbb;
        border-radius: 4px;
        width: 100%;
        box-sizing: border-box;
    }

    button {
        padding: 0.6rem 1rem;
        font-size: 1rem;
        border: none;
        border-radius: 4px;
        background: #333;
        color: white;
        cursor: pointer;
        transition: background 0.2s ease-in-out;
    }

    button:hover {
        background: #555;
    }

    .error {
        color: tomato;
        font-size: 0.875rem;
        margin-top: -0.5rem;
    }

    button[disabled] { cursor: not-allowed; opacity: 0.7; }

    .visually-hidden {
        position: absolute;
        width: 1px; height: 1px;
        overflow: hidden; clip: rect(0 0 0 0);
        white-space: nowrap; border: 0; padding: 0; margin: -1px;
    }

    .spinner {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        border: 2px solid transparent;
        border-top-color: currentColor;
        border-right-color: currentColor;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        margin-right: 0.5rem;
        vertical-align: middle;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }
</style>
