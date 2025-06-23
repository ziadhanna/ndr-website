// Determines the correct path to the header.html file based on the current page location
const getHeaderPath = () => {
    return `${window.location.origin}/components/header.html`;
};

// Loads the navbar HTML dynamically into the <header> element
const loadNavbarDynamic = async () => {
    try {
        const response = await fetch(getHeaderPath());
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const navbarHTML = await response.text();
        document.querySelector('header').innerHTML = navbarHTML;
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
};

// Sets the 'active' class on the navigation link that matches the current page
const setActiveNavItem = () => {
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('header nav a, header ul li a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        const linkPath = link.getAttribute('href').split('/').pop();
        // Set active for normal nav links
        if (linkPath === currentPath || (linkPath === '' && currentPath === '')) {
            link.classList.add('active');
        }
        // Special case: set active for user profile link if on profile.html
        if (currentPath === 'profile.html' && linkPath === '#') {
            link.classList.add('active');
        }
    });
};

// Adds a sign-in or user profile link to the navbar, depending on authentication state
const addSignInNavItem = () => {
    const user = JSON.parse(localStorage.getItem('ndrUser'));
    const navList = document.querySelector('.navbar-nav');

    // Create a separator element for visual separation
    let separator = document.createElement('li');
    separator.className = 'nav-item separator';
    separator.innerHTML = `<span class="nav-link disabled hide-small" style="pointer-events:none;opacity:0.5;">|</span>`;

    let navItem = document.createElement('li');
    navItem.className = 'nav-item';

    if (user && user.name) {
        // Dropdown for signed-in user
        navItem.classList.add('dropdown');
        navItem.innerHTML = `
            <a class="nav-link dropdown-toggle" href="#" id="profileDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                ${user.name}
            </a>
            <ul class="dropdown-menu" aria-labelledby="profileDropdown">
                <li><a class="dropdown-item" href="profile.html">Profile</a></li>
                <li><a class="dropdown-item" href="#" id="signOutLink">Sign Out</a></li>
            </ul>
        `;
    } else {
        // Otherwise, show sign-in link
        navItem.innerHTML = `<a class="nav-link" href="/signin.html">Sign In</a>`;
    }

    navList.appendChild(separator);
    navList.appendChild(navItem);

    // Add sign out handler if user is signed in
    if (user && user.name) {
        setTimeout(() => {
            const signOutLink = document.getElementById('signOutLink');
            if (signOutLink) {
                signOutLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('ndrUser');
                    window.location.href = '/signout.html';
                });
            }
        }, 0);
    }
}

const redirectToSignIn = (pageSubUrl) => {
    if (!localStorage.getItem('ndrUser')) {
        window.location.href = `signin.html?redirectUri=${window.location.origin}/${pageSubUrl}`;
    }
}

const setUserName = () => {
    const user = JSON.parse(localStorage.getItem('ndrUser'));
    if (user && user.name) {
        document.getElementById('userFullName').textContent = user.name;
    }
    else {
        document.getElementById('userFullName').textContent = "Chief";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbarDynamic();
    addSignInNavItem();
    setActiveNavItem();
    setUserName();
});