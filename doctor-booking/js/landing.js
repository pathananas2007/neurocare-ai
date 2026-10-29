/* ============================================================
   landing.js – Interactive Features for Redesigned Landing Page
   - Continuous Live Specialty Marquee (Right-to-Left Auto Scroll)
   - Dynamic Specialty Carousel with High-Quality Medical Images
   - Seamless Infinite Loop via Cloned Track Nodes
   - Interactive Pause on Hover / Drag / Touch
   - Manual Arrow Buttons (‹ / ›) with Smooth Resume
   - Active Brand Highlight & Sync with Doctor Listing Filter
   - Sticky Navbar Scroll Effects & Layered Panels
   - FAQ Accordion
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    initWebsiteSplashScreen();
    initLandingInteractions();
});

function initLandingInteractions() {
    initStickyNav();
    loadDynamicSpecialtyCarousel();
    initFaqAccordion();
    initHeroSlotPicker();
}

/* ── Animated Website Intro / Splash Screen (Elevara Inspired) ── */
function initWebsiteSplashScreen() {
    const splash = document.getElementById('wfSplashScreen');
    if (!splash) return;

    const SPLASH_SESSION_KEY = 'wf_splash_intro_shown';
    const urlParams = new URLSearchParams(window.location.search);
    const forceIntro = urlParams.has('intro') || urlParams.has('splash');

    // Check if user already saw the intro in this browser tab session or prefers reduced motion
    const hasSeenIntro = sessionStorage.getItem(SPLASH_SESSION_KEY);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!forceIntro && (hasSeenIntro || prefersReducedMotion)) {
        splash.style.display = 'none';
        return;
    }

    // Mark as shown for this browser session unless forced via URL
    if (!forceIntro) {
        sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    }

    function dismissSplash() {
        if (!splash || splash.classList.contains('wf-splash-hidden')) return;
        splash.classList.add('wf-splash-hidden');
        setTimeout(() => {
            splash.style.display = 'none';
        }, 800);
    }

    // Auto-transition to main landing page after ~4.5 seconds
    const timer = setTimeout(() => {
        dismissSplash();
    }, 4500);

    // Optional Skip button handler
    const skipBtn = document.getElementById('wfSplashSkipBtn');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            clearTimeout(timer);
            dismissSplash();
        });
    }

    // Fail-safe safeguard: ensure screen dismisses even if background processes lag
    setTimeout(() => {
        dismissSplash();
    }, 4500);
}


/* ── Sticky Navbar Blur and Shadow On Scroll ── */
function initStickyNav() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, { passive: true });
}

/* ── Specialty Metadata with High-Resolution Healthcare Images ── */
const SPECIALTY_META = {
    'Cardiologist': {
        title: 'Cardiology',
        subtitle: 'Heart & Vascular Care',
        image: 'images/specialties/cardiology.jpg',
        badge: '❤️ Cardiology',
        fallbackIcon: '❤️'
    },
    'Dermatologist': {
        title: 'Dermatology',
        subtitle: 'Skin, Hair & Aesthetics',
        image: 'images/specialties/dermatology.jpg',
        badge: '✨ Dermatology',
        fallbackIcon: '✨'
    },
    'Pediatrician': {
        title: 'Pediatrics',
        subtitle: 'Infant, Child & Teen Health',
        image: 'images/specialties/pediatrics.jpg',
        badge: '🧸 Pediatrics',
        fallbackIcon: '🧸'
    },
    'Neurologist': {
        title: 'Neurology',
        subtitle: 'Brain & Nervous System',
        image: 'images/specialties/neurology.jpg',
        badge: '🧠 Neurology',
        fallbackIcon: '🧠'
    },
    'Orthopedist': {
        title: 'Orthopedics',
        subtitle: 'Bones, Joints & Mobility',
        image: 'images/specialties/orthopedics.jpg',
        badge: '🦴 Orthopedics',
        fallbackIcon: '🦴'
    },
    'General Physician': {
        title: 'General Physician',
        subtitle: 'Family & Preventive Medicine',
        image: 'images/specialties/general_physician.jpg',
        badge: '🩺 Primary Care',
        fallbackIcon: '🩺'
    },
    'General Practitioner': {
        title: 'General Practitioner',
        subtitle: 'Holistic Primary Care',
        image: 'images/specialties/general_physician.jpg',
        badge: '🩺 Primary Care',
        fallbackIcon: '🩺'
    },
    'General Surgeon': {
        title: 'General Surgery',
        subtitle: 'Laparoscopic & Minor Surgery',
        image: 'images/specialties/orthopedics.jpg',
        badge: '⚕️ Surgery',
        fallbackIcon: '⚕️'
    }
};

/* ── Dynamically Populate or Enhance Specialty Carousel from Backend API ── */
async function loadDynamicSpecialtyCarousel() {
    const track = document.getElementById('specialtyTrack');
    if (!track) return;

    try {
        let availableSpecialties = [];
        if (typeof _api === 'function') {
            const { ok, data } = await _api('/doctors');
            if (ok && Array.isArray(data)) {
                const unique = [...new Set(data.map(d => d.specialization).filter(Boolean))];
                if (unique.length > 0) availableSpecialties = unique;
            }
        }

        if (availableSpecialties.length === 0) {
            availableSpecialties = [
                'Cardiologist',
                'Dermatologist',
                'Pediatrician',
                'Neurologist',
                'Orthopedist',
                'General Physician',
                'General Surgeon'
            ];
        }

        track.innerHTML = '';

        // Helper to construct individual specialty card DOM element
        function createCard(specKey) {
            const meta = SPECIALTY_META[specKey] || {
                title: specKey,
                subtitle: 'Specialized Medical Care',
                image: 'images/specialties/general_physician.jpg',
                badge: `⚕️ ${specKey}`,
                fallbackIcon: '⚕️'
            };

            const card = document.createElement('div');
            card.className = 'specialty-card-v2';
            card.setAttribute('data-specialty', specKey);
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `Filter by ${meta.title}`);

            card.innerHTML = `
                <div class="spec-img-wrapper">
                    <img 
                        src="${meta.image}" 
                        alt="${meta.title} Department" 
                        class="spec-img" 
                        loading="lazy"
                        onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:3.5rem;background:linear-gradient(135deg,#e0e7ff,#fce7f3);\\'>${meta.fallbackIcon}</div>';"
                    >
                    <div class="spec-img-overlay"></div>
                    <span class="spec-tag-floating">${meta.badge}</span>
                </div>
                <div class="spec-content-body">
                    <h3 class="spec-title-v2">${meta.title}</h3>
                    <p class="spec-desc-v2">${meta.subtitle}</p>
                    <div class="spec-footer-cta">
                        <span>View Specialists</span>
                        <span class="arrow-icon">→</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                selectSpecialty(specKey, card);
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectSpecialty(specKey, card);
                }
            });

            return card;
        }

        // Build base cards
        availableSpecialties.forEach(specKey => {
            track.appendChild(createCard(specKey));
        });

        // Clone cards to create a continuous seamless loop
        availableSpecialties.forEach(specKey => {
            track.appendChild(createCard(specKey));
        });

        // Initialize Continuous Right-to-Left Live Movement
        initLiveContinuousCarousel();

    } catch (err) {
        console.warn('Specialty carousel dynamic load fallback:', err);
    }
}

/* ── Live Auto-Scroll (Right-to-Left Continuous Smooth Motion) ── */
let _marqueeAnimationId = null;
let _isMarqueePaused = false;
let _marqueeResumeTimeout = null;

function initLiveContinuousCarousel() {
    const trackContainer = document.getElementById('specialtyTrackContainer');
    const track = document.getElementById('specialtyTrack');
    const prevBtn = document.getElementById('specPrevBtn');
    const nextBtn = document.getElementById('specNextBtn');

    if (!trackContainer || !track) return;

    // Movement speed: pixels per frame (~0.85px per 60fps frame = smooth gentle glide)
    const baseSpeed = 0.85;

    function step() {
        if (!_isMarqueePaused) {
            // Halfwidth is the length of one full set of original cards
            const halfWidth = track.scrollWidth / 2;

            trackContainer.scrollLeft += baseSpeed;

            // When scrolled past the first set, loop back seamlessly
            if (trackContainer.scrollLeft >= halfWidth) {
                trackContainer.scrollLeft = 0;
            }
        }
        _marqueeAnimationId = requestAnimationFrame(step);
    }

    // Cancel any previous loop and start fresh
    if (_marqueeAnimationId) cancelAnimationFrame(_marqueeAnimationId);
    _marqueeAnimationId = requestAnimationFrame(step);

    // Pause on Hover so users can inspect, click, or read
    trackContainer.addEventListener('mouseenter', () => {
        _isMarqueePaused = true;
    });

    trackContainer.addEventListener('mouseleave', () => {
        _isMarqueePaused = false;
    });

    // Arrow Button Controls: smoothly jump forward/backward and pause briefly
    const jumpDistance = 320;

    function pauseAndResume(delay = 1800) {
        _isMarqueePaused = true;
        clearTimeout(_marqueeResumeTimeout);
        _marqueeResumeTimeout = setTimeout(() => {
            _isMarqueePaused = false;
        }, delay);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            pauseAndResume(2000);
            trackContainer.scrollBy({ left: -jumpDistance, behavior: 'smooth' });
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            pauseAndResume(2000);
            trackContainer.scrollBy({ left: jumpDistance, behavior: 'smooth' });
        });
    }

    // Interactive Dragging with Mouse
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    trackContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        _isMarqueePaused = true;
        trackContainer.classList.add('dragging');
        startX = e.pageX - trackContainer.offsetLeft;
        scrollLeft = trackContainer.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
        if (isDown) {
            isDown = false;
            trackContainer.classList.remove('dragging');
            pauseAndResume(1500);
        }
    });

    trackContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - trackContainer.offsetLeft;
        const walk = (x - startX) * 1.5;
        trackContainer.scrollLeft = scrollLeft - walk;
    });

    // Touch Support for Mobile
    trackContainer.addEventListener('touchstart', () => {
        _isMarqueePaused = true;
    }, { passive: true });

    trackContainer.addEventListener('touchend', () => {
        pauseAndResume(2500);
    }, { passive: true });
}

/* ── Select Specialty and Scroll Smoothly to Directory ── */
function selectSpecialty(specKey, selectedCard) {
    const allCards = document.querySelectorAll('.specialty-card-v2');
    allCards.forEach(c => {
        if (c.getAttribute('data-specialty') === specKey) {
            c.classList.add('active');
        } else {
            c.classList.remove('active');
        }
    });

    const specSelect = document.getElementById('specializationFilter');
    if (specSelect) {
        let matchedOption = false;
        for (let i = 0; i < specSelect.options.length; i++) {
            if (specSelect.options[i].value === specKey) {
                matchedOption = true;
                break;
            }
        }
        if (!matchedOption) {
            const opt = document.createElement('option');
            opt.value = specKey;
            opt.textContent = specKey;
            specSelect.appendChild(opt);
        }

        specSelect.value = specKey;
        specSelect.dispatchEvent(new Event('change'));
    }

    const dirSection = document.getElementById('doctorDirectory');
    if (dirSection) {
        dirSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/* ── Hero Interactive Slot Selection ── */
function initHeroSlotPicker() {
    const slotPills = document.querySelectorAll('.hg-slot-pill');
    slotPills.forEach(pill => {
        pill.addEventListener('click', () => {
            slotPills.forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
        });
    });
}

/* ── FAQ Accordion ── */
function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const trigger = item.querySelector('.faq-trigger');
        if (!trigger) return;

        trigger.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            faqItems.forEach(i => i.classList.remove('open'));
            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });
}
