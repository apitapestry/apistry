// Custom JavaScript to change the site name link to point to overview.md
document.addEventListener("DOMContentLoaded", function() {
    // Find the site name/logo link in the header (the icon)
    const logoLink = document.querySelector('.md-header__button.md-logo');

    if (logoLink) {
        // Hardcode to overview page - find the site root
        const pathParts = window.location.pathname.split('/').filter(p => p);
        // Remove the last part if it's a page name
        if (pathParts.length > 0 && !pathParts[pathParts.length - 1].endsWith('/')) {
            pathParts.pop();
        }
        const siteRoot = '/' + pathParts.join('/');
        logoLink.href = siteRoot + (siteRoot.endsWith('/') ? '' : '/') + 'overview/';
    }

    // Also make the site title text clickable
    const headerTopics = document.querySelectorAll('.md-header__topic');
    headerTopics.forEach(function(topic) {
        if (!topic.querySelector('a') && topic.textContent.trim()) {
            topic.style.cursor = 'pointer';
            topic.addEventListener('click', function() {
                const pathParts = window.location.pathname.split('/').filter(p => p);
                if (pathParts.length > 0 && !pathParts[pathParts.length - 1].endsWith('/')) {
                    pathParts.pop();
                }
                const siteRoot = '/' + pathParts.join('/');
                window.location.href = siteRoot + (siteRoot.endsWith('/') ? '' : '/') + 'overview/';
            });
        }
    });
});

