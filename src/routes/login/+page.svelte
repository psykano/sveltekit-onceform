<script lang="ts">
    import { enhance } from '$app/forms';

    export let data: any;
    export let form: any;
</script>

<form method="POST" use:enhance>
    <!-- Optional token -->
    <input type="hidden" name="once" value={data.token} />

    <input type="text" name="user" value={form?.data?.user ?? ''} />
    {#if form?.errors?.user}
        <p class="error">{form.errors.user}</p>
    {/if}

    <input type="password" name="password" value={form?.data?.password ?? ''} />
    {#if form?.errors?.password}
        <p class="error">{form.errors.password}</p>
    {/if}

    <button type="submit">Login</button>
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
</style>
