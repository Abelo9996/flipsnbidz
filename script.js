// Announcement Banner
const announcementBanner = document.getElementById('announcementBanner');
const closeBanner = document.getElementById('closeBanner');

// Check if banner was previously closed
if (sessionStorage.getItem('bannerClosed') === 'true') {
    announcementBanner.classList.add('hidden');
    announcementBanner.style.display = 'none';
}

// Close banner functionality
if (closeBanner) {
    closeBanner.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        announcementBanner.classList.add('hidden');
        sessionStorage.setItem('bannerClosed', 'true');
        
        // Remove from DOM after animation
        setTimeout(() => {
            announcementBanner.style.display = 'none';
        }, 300);
    });
}

// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        
        // Animate hamburger to X
        const spans = hamburger.querySelectorAll('span');
        if (navMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(7px, 7px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(7px, -7px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
}

// Close mobile menu when clicking on a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (!navMenu || !hamburger) return;
        navMenu.classList.remove('active');
        const spans = hamburger.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    });
});

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 70;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Active Navigation Link on Scroll
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    const navHeight = 70;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= (sectionTop - navHeight - 100)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });

    // Add shadow to header on scroll
    const header = document.querySelector('.header');
    if (header) {
        if (window.scrollY > 100) {
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
        } else {
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }
    }
});

// Accordion Functionality
const accordionHeaders = document.querySelectorAll('.accordion-header');

accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
        const accordionItem = header.parentElement;
        const isActive = accordionItem.classList.contains('active');

        // Close all accordion items
        document.querySelectorAll('.accordion-item').forEach(item => {
            item.classList.remove('active');
        });

        // Open clicked item if it wasn't active
        if (!isActive) {
            accordionItem.classList.add('active');
        }
    });
});

// Initialize EmailJS
emailjs.init('aTiA22BTw9ab_DQDm'); // Your EmailJS public key

// Contact Form Submission
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        // Show loading state
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            message: document.getElementById('message').value,
            to_email: 'flipsnbidz@gmail.com'
        };

        try {
            // Send email using EmailJS
            await emailjs.send(
                'service_exdu8rc',      // Your service ID
                'template_contact',     // Contact template ID (you'll create this)
                formData
            );
            
            console.log('✅ Contact form email sent successfully');
            showNotification('Thank you for your message! We\'ll get back to you soon.', 'success');
            
            // Reset form
            contactForm.reset();
            
        } catch (error) {
            console.error('❌ Error sending contact form email:', error);
            showNotification('Failed to send message. Please email us directly at flipsnbidz@gmail.com', 'error');
        } finally {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Notification Function
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -8% 0px'
};

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const hasEnteredEnough = entry.isIntersecting && entry.intersectionRatio >= 0.2;
        if (hasEnteredEnough) {
            entry.target.classList.remove('reveal-pending');
            entry.target.classList.add('animated');
            revealObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

function applyScrollRevealTargets() {
    const groupedSelectors = [
        { selector: '.animate-on-scroll', animation: null },
        { selector: 'section > .container > h1, section > .container > h2, section > .container > p', animation: 'fade-in-up' },
        { selector: '.section-title, .section-subtitle, .offer-heading, .appointment-header, .faq-hero h1, .faq-subtitle, .terms-hero h1, .effective-date', animation: 'fade-in-up' },
        { selector: '.hero-content > *, .pallets-hero-content > *, .supplier-visual-card', animation: 'fade-in-up' },
        { selector: '.feature-card, .step, .info-card, .category-card, .market-card, .award-badge-wrapper, .faq-item, .terms-section, .terms-subsection, .contact-box, .footer-section, .calendar-section, .form-wrapper, .review-cta-card, .selected-appointment-info, .modal-content, .manifest-form-card, .manifest-sidecard', animation: 'fade-in-up' },
        { selector: '.industries-list .industry-tag, .supplier-legend-item, .help-buttons > *, .terms-footer > *, .social-links a, .footer-bottom, .faq-notice, .faq-help-section, .privacy-guarantee, .contact-methods p', animation: 'fade-in-up' },
        { selector: '.accordion-item, .policy-accordion .accordion-item, .faq-accordion .faq-item', animation: 'fade-in-up' }
    ];

    const seen = new Set();
    let count = 0;

    groupedSelectors.forEach(group => {
        const elements = document.querySelectorAll(group.selector);
        elements.forEach((el, index) => {
            if (seen.has(el)) return;
            seen.add(el);

            if (!el.classList.contains('animate-on-scroll')) {
                el.classList.add('animate-on-scroll');
                if (group.animation) el.classList.add(group.animation);
            }

            if (!el.classList.contains('fade-in') && !el.classList.contains('fade-in-up') && !el.classList.contains('fade-in-down') && !el.classList.contains('fade-in-left') && !el.classList.contains('fade-in-right') && !el.classList.contains('scale-in') && !el.classList.contains('slide-in-up')) {
                el.classList.add(group.animation || 'fade-in-up');
            }

            if (!el.style.animationDelay) {
                el.style.animationDelay = `${Math.min((index % 6) * 0.08, 0.4)}s`;
            }

            const rect = el.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const aboveViewport = rect.bottom <= 0;
            const alreadyVisible = rect.top < viewportHeight && rect.bottom > 0;

            if (aboveViewport || alreadyVisible) {
                el.classList.remove('reveal-pending');
                el.classList.add('animated');
            } else {
                el.classList.add('reveal-pending');
                revealObserver.observe(el);
            }

            count += 1;
        });
    });

    console.log(`✨ Initialized scroll animations for ${count} elements`);
}

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    applyScrollRevealTargets();
});

// Phone number formatter (optional enhancement)
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            if (value.length <= 3) {
                value = value;
            } else if (value.length <= 6) {
                value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            } else {
                value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
            }
        }
        e.target.value = value;
    });
}

// Add scroll-to-top button
const scrollTopBtn = document.createElement('button');
scrollTopBtn.innerHTML = '↑';
scrollTopBtn.className = 'scroll-top-btn';
scrollTopBtn.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: white;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 999;
    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
`;

document.body.appendChild(scrollTopBtn);

// Show/hide scroll-to-top button
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollTopBtn.style.opacity = '1';
        scrollTopBtn.style.visibility = 'visible';
    } else {
        scrollTopBtn.style.opacity = '0';
        scrollTopBtn.style.visibility = 'hidden';
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

scrollTopBtn.addEventListener('mouseenter', () => {
    scrollTopBtn.style.transform = 'scale(1.1)';
});

scrollTopBtn.addEventListener('mouseleave', () => {
    scrollTopBtn.style.transform = 'scale(1)';
});

// Countdown Timer to Next Sunday 6PM PT
function updateCountdown() {
    const now = new Date();
    
    // Convert current time to PT (UTC-8 or UTC-7 depending on DST)
    const ptOffset = -8; // PST offset, adjust for PDT if needed
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nowPT = new Date(utc + (3600000 * ptOffset));
    
    // Find next Sunday at 6PM PT
    let targetDate = new Date(nowPT);
    
    // If today is Sunday
    if (nowPT.getDay() === 0) {
        // If it's before 6PM, target today at 6PM
        if (nowPT.getHours() < 18) {
            targetDate.setHours(18, 0, 0, 0);
        } else {
            // If it's after 6PM, target next Sunday
            targetDate.setDate(nowPT.getDate() + 7);
            targetDate.setHours(18, 0, 0, 0);
        }
    } else {
        // For other days, calculate days until next Sunday
        const daysUntilSunday = (7 - nowPT.getDay()) % 7;
        targetDate.setDate(nowPT.getDate() + daysUntilSunday);
        targetDate.setHours(18, 0, 0, 0);
    }
    
    // Calculate time difference
    const timeDiff = targetDate - nowPT;
    
    if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        // Update display
        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        
        if (daysEl) daysEl.textContent = days;
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }
}

// Update countdown every second
if (document.getElementById('days')) {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Console log for debugging
console.log('Flips & Bidz website loaded successfully!');
console.log('Contact: 626-944-3190 | Email: flipsnbidz@gmail.com');
