// Holiday Theme Configuration
// Set ENABLED to false after holidays to return to normal theme

const HOLIDAY_THEME = {
    ENABLED: false, // Toggle this to enable/disable holiday theme
    START_DATE: '2025-12-01',
    END_DATE: '2026-01-05',
    
    // Theme colors (subtle, won't drastically change the site)
    ACCENT_COLOR: '#c41e3a', // Christmas red
    SECONDARY_COLOR: '#165b33', // Christmas green
    GOLD_ACCENT: '#d4af37', // Gold for special touches
    
    // Snowfall effect
    SHOW_SNOWFLAKES: true,
    
    // Holiday banner message
    BANNER_MESSAGE: '🎄 Christmas Special: Extended hours during December! Great deals on liquidation items! 🎁',
    
    // Special messaging
    CTA_TEXT: '🎁 Shop Holiday Deals',
    APPOINTMENT_NOTE: '🎄 Book your holiday shopping appointment today!'
};

// Auto-enable/disable based on dates
function isHolidayPeriod() {
    if (!HOLIDAY_THEME.ENABLED) return false;
    
    const now = new Date();
    const start = new Date(HOLIDAY_THEME.START_DATE);
    const end = new Date(HOLIDAY_THEME.END_DATE);
    
    return now >= start && now <= end;
}

// Apply holiday theme
if (isHolidayPeriod()) {
    document.addEventListener('DOMContentLoaded', () => {
        applyHolidayTheme();
    });
}

function applyHolidayTheme() {
    // Add holiday class to body
    document.body.classList.add('holiday-theme');
    
    // Add subtle holiday styling
    const style = document.createElement('style');
    style.textContent = `
        /* Subtle holiday theme - can be easily removed */
        .holiday-theme {
            position: relative;
        }
        
        /* Add subtle red/green accents to buttons and links */
        .holiday-theme .cta-button:hover {
            background: linear-gradient(135deg, ${HOLIDAY_THEME.ACCENT_COLOR} 0%, #a01729 100%);
            box-shadow: 0 8px 25px rgba(196, 30, 58, 0.3);
        }
        
        /* Holiday touches on header */
        .holiday-theme .header {
            border-bottom: 2px solid ${HOLIDAY_THEME.ACCENT_COLOR};
        }
        
        /* Subtle holiday emoji decorations */
        .holiday-decoration {
            display: inline-block;
            margin: 0 0.25rem;
            animation: gentle-pulse 3s ease-in-out infinite;
        }
        
        @keyframes gentle-pulse {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 1; }
        }
        
        /* Snowflake animation (very subtle) */
        .snowflake {
            position: fixed;
            top: -10px;
            z-index: 9999;
            user-select: none;
            cursor: default;
            animation: fall linear infinite;
            color: rgba(255, 255, 255, 0.9);
            font-size: 2rem;
            pointer-events: none;
        }
        
        @keyframes fall {
            to {
                transform: translateY(100vh) rotate(360deg);
            }
        }
        
        /* Holiday banner styling */
        .holiday-banner {
            background: linear-gradient(135deg, ${HOLIDAY_THEME.ACCENT_COLOR} 0%, ${HOLIDAY_THEME.SECONDARY_COLOR} 100%);
            color: white;
            padding: 0.75rem 1rem;
            text-align: center;
            font-weight: 600;
            position: relative;
            overflow: hidden;
            animation: holiday-shine 3s ease-in-out infinite;
        }
        
        @keyframes holiday-shine {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.1); }
        }
        
        /* Add sparkle to special elements */
        .holiday-sparkle::after {
            content: '✨';
            margin-left: 0.5rem;
            display: inline-block;
            animation: gentle-pulse 2s ease-in-out infinite;
        }
        
        /* Festive card borders */
        .holiday-theme .feature-card:hover,
        .holiday-theme .info-card:hover {
            border-color: ${HOLIDAY_THEME.ACCENT_COLOR};
            box-shadow: 0 8px 30px rgba(196, 30, 58, 0.15);
        }
    `;
    document.head.appendChild(style);
    
    // Add holiday banner
    addHolidayBanner();
    
    // Add subtle snowflakes
    if (HOLIDAY_THEME.SHOW_SNOWFLAKES) {
        addSnowflakes();
    }
    
    // Add holiday decorations to headings
    addHolidayDecorations();
    
    // Update CTA buttons with holiday messaging
    updateCTAButtons();
}

function addHolidayBanner() {
    const existingBanner = document.getElementById('announcementBanner');
    
    if (existingBanner) {
        // Replace existing banner content
        const bannerContent = existingBanner.querySelector('.announcement-message');
        if (bannerContent) {
            bannerContent.innerHTML = `<strong>🎄 Holiday Special!</strong> ${HOLIDAY_THEME.BANNER_MESSAGE.replace('🎄', '').replace('🎁', '')} <span class="holiday-decoration">🎁</span>`;
        }
        existingBanner.querySelector('.announcement-banner').classList.add('holiday-banner');
    }
}

function addSnowflakes() {
    // Create snowfall effect
    const snowflakes = ['❄', '❅', '❆'];
    const numberOfFlakes = 30;
    
    for (let i = 0; i < numberOfFlakes; i++) {
        setTimeout(() => {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
            snowflake.style.left = Math.random() * 100 + '%';
            snowflake.style.animationDuration = (Math.random() * 5 + 8) + 's';
            snowflake.style.opacity = Math.random() * 0.4 + 0.5;
            snowflake.style.fontSize = (Math.random() * 1 + 1.5) + 'rem';
            
            document.body.appendChild(snowflake);
            
            // Remove after animation completes
            setTimeout(() => {
                snowflake.remove();
            }, parseFloat(snowflake.style.animationDuration) * 1000);
        }, i * 2000);
    }
    
    // Re-add snowflakes periodically (more frequently)
    setInterval(() => {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
        snowflake.style.left = Math.random() * 100 + '%';
        const duration = Math.random() * 5 + 8;
        snowflake.style.animationDuration = duration + 's';
        snowflake.style.opacity = Math.random() * 0.4 + 0.5;
        snowflake.style.fontSize = (Math.random() * 1 + 1.5) + 'rem';
        
        document.body.appendChild(snowflake);
        
        setTimeout(() => snowflake.remove(), duration * 1000);
    }, 3000); // Spawn new snowflake every 3 seconds instead of 10
}

function addHolidayDecorations() {
    // Add subtle decorations to main headings
    const mainHeading = document.querySelector('.hero-title');
    if (mainHeading && !mainHeading.querySelector('.holiday-decoration')) {
        const decoration = document.createElement('span');
        decoration.className = 'holiday-decoration';
        decoration.textContent = '🎄';
        mainHeading.appendChild(decoration);
    }
    
    // Add decoration to section titles
    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach((title, index) => {
        if (!title.querySelector('.holiday-decoration')) {
            const emoji = index % 2 === 0 ? '🎁' : '🎄';
            const decoration = document.createElement('span');
            decoration.className = 'holiday-decoration';
            decoration.textContent = emoji;
            decoration.style.fontSize = '0.8em';
            title.appendChild(decoration);
        }
    });
}

function updateCTAButtons() {
    // Add sparkle effect to primary CTA buttons
    const ctaButtons = document.querySelectorAll('.cta-button, .hero-cta .cta-primary');
    ctaButtons.forEach(button => {
        if (!button.classList.contains('holiday-sparkle')) {
            button.classList.add('holiday-sparkle');
        }
    });
    
    // Update appointment page note
    const appointmentSection = document.querySelector('#appointment');
    if (appointmentSection) {
        const note = document.createElement('p');
        note.className = 'holiday-note';
        note.innerHTML = `<strong>🎄 ${HOLIDAY_THEME.APPOINTMENT_NOTE}</strong>`;
        note.style.cssText = 'color: #c41e3a; text-align: center; font-size: 1.1rem; margin: 1rem 0;';
        
        const form = appointmentSection.querySelector('.appointment-form');
        if (form && !appointmentSection.querySelector('.holiday-note')) {
            form.parentNode.insertBefore(note, form);
        }
    }
}

// Expose function to disable theme manually
window.disableHolidayTheme = function() {
    document.body.classList.remove('holiday-theme');
    document.querySelectorAll('.snowflake').forEach(el => el.remove());
    document.querySelectorAll('.holiday-decoration').forEach(el => el.remove());
    document.querySelectorAll('.holiday-sparkle').forEach(el => el.classList.remove('holiday-sparkle'));
    document.querySelectorAll('.holiday-note').forEach(el => el.remove());
    console.log('Holiday theme disabled');
};
