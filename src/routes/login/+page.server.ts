import { fail } from '@sveltejs/kit';
import { addFormToken, onceAction, kitRedirect } from '$lib/onceForm';

export const load = (event) => addFormToken(event);

export const actions = {
    default: onceAction(async ({ request }) => {
        // Collect form data
        const formData = await request.formData();
        const user = String(formData.get('user') ?? '');
        const password = String(formData.get('password') ?? '');

        // Simulate slow server (3 seconds)
        await new Promise((res) => setTimeout(res, 3000));

        // Basic validation
        const errors: { user?: string; password?: string; db?: string } = {};
        if (!user) {
            errors.user = 'Username is required';
        }
        if (!password) {
            errors.password = 'Password is required';
        }

        // Simulate database lookup
        // User: admin
        // Password: password
        if (!Object.keys(errors).length) {
            if (user !== 'admin' || password !== 'password') {
                errors.db = 'Wrong username or password';
            }
        }

        // Upon failure respond with 400 (Bad Request)
        if (Object.keys(errors).length) {
            return fail(400, {
                data:   { user, password },
                errors
            });
        }

        // Upon success redirect home
        return kitRedirect('/');
    })
};

