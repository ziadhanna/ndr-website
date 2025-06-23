const auth0Client = new auth0.WebAuth({
    domain: 'login.41sol.com',
    clientID: 'FjRSBqW7JCWBLsCymamM2pPWgLz4yWDl',
    redirectUri: window.location.origin,
    responseType: 'token id_token'
});

function handleSignOut() {
    auth0Client.logout({
        returnTo: window.location.origin,
        clientID: 'FjRSBqW7JCWBLsCymamM2pPWgLz4yWDl'
    });
}

window.onload = handleSignOut;