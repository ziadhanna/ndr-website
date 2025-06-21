// Determines the correct path to the header.html file based on the current page location
const getHeaderPath = () => {
    if (window.location.pathname.includes('/pages/')) {
        return '../components/header.html';
    }
    return './components/header.html';
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
        if (linkPath === currentPath || (linkPath === '' && currentPath === '')) {
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
    separator.innerHTML = `<span class="nav-link disabled" style="pointer-events:none;opacity:0.5;">|</span>`;

    // Create the sign-in or profile nav item
    let navItem = document.createElement('li');
    navItem.className = 'nav-item';

    if (user && user.name) {
        // If user is signed in, show profile link
        navItem.innerHTML = `<a class="nav-link" href="../pages/profile.html">${user.name}</a>`;
    } else {
        // Otherwise, show sign-in link
        navItem.innerHTML = `<a class="nav-link" href="../pages/signin.html">Sign In</a>`;
    }

    // Append separator and nav item to the navbar
    navList.appendChild(separator);
    navList.appendChild(navItem);
}
document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbarDynamic().then(setActiveNavItem);
    addSignInNavItem();
});