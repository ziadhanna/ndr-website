// Replace these values with your Auth0 domain and client ID
const auth0Client = new auth0.WebAuth({
    domain: 'login.41sol.com',
    clientID: 'FjRSBqW7JCWBLsCymamM2pPWgLz4yWDl',
    redirectUri: window.location.href,
    responseType: 'token id_token',
    scope: 'openid profile email'
});

const getRedirectUri = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirectUri') || window.location.origin;
}

function handleAuthentication() {
    auth0Client.parseHash((err, authResult) => {
        if (authResult && authResult.accessToken) {
            auth0Client.client.userInfo(authResult.accessToken, async (err, user) => {
                if (user) {
                    const nameOrEmail = user.name || user.email;
                    document.getElementById('welcome').textContent = `Welcome, ${nameOrEmail}`;
                    window.location.href = getRedirectUri();
                    localStorage.setItem('ndrUser', JSON.stringify(user));
                } else if (err) {
                    document.getElementById('welcome').textContent = `Error: ${err.errorDescription}`;
                }
            });
        }
    });
}

document.getElementById('signInBtn').onclick = function () {
    auth0Client.authorize();
};

// Handle authentication if returning from Auth0
window.onload = handleAuthentication;