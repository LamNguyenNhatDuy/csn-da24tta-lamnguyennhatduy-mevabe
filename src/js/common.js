document.addEventListener('DOMContentLoaded', function () {
    // 1. Mobile navigation toggle
    const header = document.querySelector('.header');
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelectorAll('.nav-link');

    if (header && navToggle) {
        navToggle.addEventListener('click', function () {
            const isOpen = header.classList.toggle('nav-open');
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        navLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                header.classList.remove('nav-open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // 2. Highlight active section link on scroll
    const anchorLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
    if (anchorLinks.length > 0 && 'IntersectionObserver' in window) {
        const linkBySection = new Map();
        anchorLinks.forEach(function (link) {
            const targetId = link.getAttribute('href').slice(1);
            const section = targetId ? document.getElementById(targetId) : null;
            if (section) {
                linkBySection.set(section, link);
            }
        });

        if (linkBySection.size > 0) {
            const observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    const matchedLink = linkBySection.get(entry.target);
                    if (!matchedLink) return;
                    if (entry.isIntersecting) {
                        anchorLinks.forEach(function (l) { l.classList.remove('active'); });
                        matchedLink.classList.add('active');
                    }
                });
            }, {
                rootMargin: '-40% 0px -55% 0px'
            });

            linkBySection.forEach(function (_link, section) {
                observer.observe(section);
            });
        }
    }

    // 3. Toggle password visibility
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            const wrap = btn.closest('.input-icon-wrap');
            if (!wrap) return;
            const input = wrap.querySelector('input');
            const icon = btn.querySelector('i');
            if (!input) return;

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            if (icon) {
                icon.classList.toggle('fa-eye', !isPassword);
                icon.classList.toggle('fa-eye-slash', isPassword);
            }
        });
    });

    // 4. Footer year
    const footerYear = document.getElementById('footer-year');
    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }

    // 5. Close modal when clicking overlay backdrop
    const modalOverlays = document.querySelectorAll('.modal-overlay');
    modalOverlays.forEach(function (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
            }
        });
    });
});
