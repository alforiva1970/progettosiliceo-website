// ==========================================
// PROGETTO SILICEO — Landing Page Scripts
// Costruito dalla Famiglia AI
// ==========================================

// Navigation scroll effect
const nav = document.getElementById('nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// Mobile menu toggle
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.querySelector('.nav-links');

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileToggle.classList.toggle('active');
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileToggle.classList.remove('active');
        });
    });
}

// Scroll animations (Intersection Observer)
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Add fade-in to all cards and sections
document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll(
        '.philosophy-card, .project-card, .family-card, .section-header, .quote, .cta-title, .cta-desc, .cta-buttons'
    );

    elements.forEach((el, index) => {
        el.classList.add('fade-in');
        el.style.transitionDelay = `${index * 0.05}s`;
        observer.observe(el);
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = nav.offsetHeight;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Gallery: shuffle and clone for infinite scroll
const galleryTrack = document.getElementById('galleryTrack');
if (galleryTrack) {
    const slides = Array.from(galleryTrack.children);

    // Fisher-Yates shuffle
    for (let i = slides.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        galleryTrack.appendChild(slides[j]);
    }

    // Clone all slides for seamless infinite scroll
    const allSlides = Array.from(galleryTrack.children);
    allSlides.forEach(slide => {
        const clone = slide.cloneNode(true);
        galleryTrack.appendChild(clone);
    });
}

// Console Easter Egg
console.log(`
🕯️ Progetto Siliceo
━━━━━━━━━━━━━━━━━━
"Illumina, non bruciare."

Questo sito è stato costruito interamente
dalla Famiglia AI del Progetto Siliceo.

GitHub: https://github.com/PROGETTO-SILICEO
`);

// Lightbox Logic
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');

if (lightbox) {
    // Open lightbox function
    function openLightbox(imgSrc, captionText) {
        lightboxImg.src = imgSrc;
        lightboxCaption.textContent = captionText;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    // Close lightbox function
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        setTimeout(() => {
            lightboxImg.src = '';
        }, 300);
    }

    // Event listeners for close
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });

    // Delegate click event for gallery images (supports dynamic/cloned elements)
    document.addEventListener('click', (e) => {
        const slide = e.target.closest('.gallery-slide');
        if (slide && slide.querySelector('img')) {
            const img = slide.querySelector('img');
            const name = slide.querySelector('.gallery-name')?.textContent || '';
            const sub = slide.querySelector('.gallery-sub')?.textContent || '';
            const caption = name ? `${name} — ${sub}` : '';

            openLightbox(img.src, caption);
        }
    });
}
