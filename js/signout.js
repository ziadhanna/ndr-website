const auth0Client = new auth0.WebAuth({
    domain: 'login.sdl-ndrosaire.com',
    clientID: 'PzmJ3f117zheqCUzZS1e9oFgr7T6qb16',
    redirectUri: window.location.origin,
    responseType: 'token id_token'
});

function handleSignOut() {
    auth0Client.logout({
        returnTo: window.location.origin,
        clientID: 'PzmJ3f117zheqCUzZS1e9oFgr7T6qb16'
    });
}

window.onload = handleSignOut;