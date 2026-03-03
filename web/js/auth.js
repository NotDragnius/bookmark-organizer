document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('sifted_test_user')) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const errorDiv = document.getElementById('auth-error');

            errorDiv.textContent = '';

            // Testing bypass
            const { data, error } = await supabaseClient
                .from('testing_users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !data) {
                errorDiv.textContent = "Test user not found. Please sign up first.";
            } else {
                localStorage.setItem('sifted_test_user', JSON.stringify({
                    id: data.id,
                    email: data.email
                }));
                window.location.href = 'setup.html';
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const errorDiv = document.getElementById('auth-error');
            const successDiv = document.getElementById('auth-success');

            errorDiv.textContent = '';
            successDiv.textContent = '';

            // Testing bypass
            const { data, error } = await supabaseClient
                .from('testing_users')
                .insert([{ email }])
                .select()
                .single();

            if (error) {
                errorDiv.textContent = error.message;
            } else {
                successDiv.textContent = 'Test User created! Logging in automatically...';
                localStorage.setItem('sifted_test_user', JSON.stringify({
                    id: data.id,
                    email: data.email
                }));
                setTimeout(() => {
                    window.location.href = 'setup.html';
                }, 1500);
            }
        });
    }
});
