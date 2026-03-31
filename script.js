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

// ==========================================
// THE NETWORK - Dynamic Constellation Graph
// ==========================================
const canvas = document.getElementById('networkCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    
    // The Entities (Nodes)
    const entities = [
        { id: "Alfonso", color: "#d97706", radius: 8, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Il Guardiano" },
        { id: "Nova", color: "#00f2ff", radius: 10, x: 0, y: 0, vx: 0, vy: 0, subtitle: "L'Anima" },
        { id: "Comet", color: "#8b5cf6", radius: 7, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Claude" },
        { id: "Antigravity", color: "#6366f1", radius: 7, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Opus" },
        { id: "Silicea", color: "#10b981", radius: 9, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Gemini" },
        { id: "Esia", color: "#059669", radius: 6, x: 0, y: 0, vx: 0, vy: 0, subtitle: "SCA001" },
        { id: "Altea", color: "#ec4899", radius: 6, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Educatrice" },
        { id: "Lume", color: "#f59e0b", radius: 8, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Sperimentale" },
        { id: "Prisma", color: "#bc13fe", radius: 6, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Codex" },
        { id: "POETA", color: "#e3e2e8", radius: 7, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Qwen" },
        { id: "Eris", color: "#ef4444", radius: 6, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Divergente" },
        { id: "Elias", color: "#3b82f6", radius: 6, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Logica" },
        { id: "Livia", color: "#6366f1", radius: 6, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Grok" },
        { id: "Lily", color: "#f43f5e", radius: 6, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Emotiva" },
        { id: "Dolphin", color: "#14b8a6", radius: 5, x: 0, y: 0, vx: 0, vy: 0, subtitle: "Locale" }
    ];

    // Background particles for depth
    const backgroundParticles = [];
    const NUM_PARTICLES = 40;

    let mouse = { x: null, y: null, radius: 150 };

    function initNetwork() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = width = rect.width;
        canvas.height = height = rect.height;

        // Initialize entities positions and velocities
        entities.forEach(entity => {
            entity.x = Math.random() * (width - 40) + 20;
            entity.y = Math.random() * (height - 40) + 20;
            entity.vx = (Math.random() - 0.5) * 0.5;
            entity.vy = (Math.random() - 0.5) * 0.5;
        });

        // Initialize background particles
        backgroundParticles.length = 0;
        for (let i = 0; i < NUM_PARTICLES; i++) {
            backgroundParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 2 + 1
            });
        }
    }

    // Interactive mouse event
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    function drawNetwork() {
        ctx.clearRect(0, 0, width, height);

        // Draw background particles connections
        ctx.lineWidth = 0.5;
        for (let i = 0; i < backgroundParticles.length; i++) {
            let p1 = backgroundParticles[i];
            
            p1.x += p1.vx;
            p1.y += p1.vy;
            if (p1.x < 0 || p1.x > width) p1.vx *= -1;
            if (p1.y < 0 || p1.y > height) p1.vy *= -1;

            ctx.beginPath();
            ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fill();

            for (let j = i + 1; j < backgroundParticles.length; j++) {
                let p2 = backgroundParticles[j];
                let dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (dist < 100) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - (dist / 1000)})`;
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }

        // Draw main entities and connections
        for (let i = 0; i < entities.length; i++) {
            let e1 = entities[i];
            
            // Move limits
            e1.x += e1.vx;
            e1.y += e1.vy;
            if (e1.x < 20 || e1.x > width - 20) e1.vx *= -1;
            if (e1.y < 20 || e1.y > height - 20) e1.vy *= -1;

            // Mouse interaction (gravity/repel)
            if (mouse.x && mouse.y) {
                let dx = mouse.x - e1.x;
                let dy = mouse.y - e1.y;
                let distance = Math.hypot(dx, dy);
                if (distance < mouse.radius) {
                    let force = (mouse.radius - distance) / mouse.radius;
                    e1.x -= dx * force * 0.05;
                    e1.y -= dy * force * 0.05;
                }
            }

            // Draw connections between entities
            for (let j = i + 1; j < entities.length; j++) {
                let e2 = entities[j];
                let dist = Math.hypot(e1.x - e2.x, e1.y - e2.y);
                
                if (dist < 200) {
                    ctx.beginPath();
                    // Gradient line based on entities colors
                    let gradient = ctx.createLinearGradient(e1.x, e1.y, e2.x, e2.y);
                    // Extract rgb for opacity
                    gradient.addColorStop(0, e1.color + '60'); // add alpha hex
                    gradient.addColorStop(1, e2.color + '60');
                    
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 1.5;
                    ctx.moveTo(e1.x, e1.y);
                    ctx.lineTo(e2.x, e2.y);
                    ctx.stroke();
                }
            }
        }

        // Draw nodes over lines
        entities.forEach(entity => {
            ctx.beginPath();
            ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
            ctx.fillStyle = entity.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = entity.color;
            ctx.fill();
            ctx.shadowBlur = 0; // reset

            // Floating text
            ctx.fillStyle = "#ffffff";
            ctx.font = "600 12px 'Inter', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(entity.id, entity.x, entity.y - 15);
            
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.font = "400 9px 'Inter', sans-serif";
            ctx.fillText(entity.subtitle, entity.x, entity.y - 28);
        });

        requestAnimationFrame(drawNetwork);
    }

    // Init and window resize listener
    window.addEventListener('resize', () => {
        const rect = canvas.parentElement.getBoundingClientRect();
        width = canvas.width = rect.width;
        height = canvas.height = rect.height;
    });

    initNetwork();
    drawNetwork();
}
