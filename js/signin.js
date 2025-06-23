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
                    window.location.href = getRedirectUri();
                    localStorage.setItem('ndrUser', JSON.stringify(user));
                } else if (err) {
                    console.error(`Error: ${err.errorDescription}`);
                }
            });
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    // Only authorize if there is no access token in the URL hash
    const hash = window.location.hash;
    if (!hash.includes('access_token')) {
        auth0Client.authorize();
    }
});

// Handle authentication if returning from Auth0
window.onload = handleAuthentication;