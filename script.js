// --- Controles y Canvas (Fondo) ---
const toggles = document.querySelectorAll('.toggle-wrapper');
toggles.forEach(t => t.addEventListener('click', () => t.classList.toggle('active')));

const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');
let w, h, t = 0, intensity = 1;
const waveColors = ['#9c3d42', '#b04f54', '#c36267'];

function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

function draw() {
    ctx.clearRect(0, 0, w, h);
    waveColors.forEach((color, i) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(0, h/2);
        let amplitude = (50 + i * 30) * intensity; 
        for(let x=0; x<=w; x++) { ctx.lineTo(x, h/2 + Math.sin(x*0.002 + t + i) * amplitude); }
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    });
    t += 0.02;
    if (intensity > 1) { intensity -= 0.02; } else { intensity = 1; }
    requestAnimationFrame(draw);
}
draw();

document.querySelectorAll('.interactive-btn').forEach(btn => {
    btn.addEventListener('click', () => { intensity = 2.5; });
});

// --- Mecánica de Inestabilidad Tipográfica (GRAVITUD) ---
const gravitudTitle = document.getElementById('gravitudTitle');

const breakTextIntoSpans = (element) => {
    const text = element.textContent;
    element.innerHTML = ''; 
    text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.setAttribute('data-index', index); 
        element.appendChild(span);
    });
}
breakTextIntoSpans(gravitudTitle); 

const letterSpans = gravitudTitle.querySelectorAll('span');

let isBlackoutMode = false; 
let isFullyBlack = false;   
let isReadyForFall = false; 
let isFalling = false;      

gravitudTitle.addEventListener('click', (e) => {
    if (isReadyForFall && !isFalling) {
        isFalling = true;
        
        letterSpans.forEach(s => {
            s.classList.remove('letter-blackened', 'letter-shadowed', 'letter-fading');
        });
        
        gravitudTitle.classList.add('title-fall');
        document.getElementById('subtitleContainer').classList.add('subtitle-visible');
        document.body.classList.add('scroll-allowed');
    }
});

letterSpans.forEach(span => {
    span.addEventListener('mouseover', (e) => {
        if(!isBlackoutMode && !isFullyBlack && !isFalling) {
            e.target.classList.remove('letter-fading');
            e.target.style.transitionDelay = '0s'; 
            e.target.classList.add('letter-shadowed');
        }
    });
    
    span.addEventListener('mouseout', (e) => {
        if(!isBlackoutMode && !isFullyBlack && !isFalling) {
            const target = e.target;
            const index = parseInt(target.dataset.index);

            target.classList.remove('letter-shadowed');
            target.classList.add('letter-fading');
            target.style.transitionDelay = (index * 0.15) + 's'; 

            setTimeout(() => {
                target.classList.remove('letter-fading');
                target.style.transitionDelay = '0s';
            }, (index * 150) + 1500);
        }
    });

    span.addEventListener('click', (e) => {
        if (isFalling) return; 

        const targetLetter = e.target;
        const selfIndex = parseInt(targetLetter.dataset.index);

        if (e.detail === 1) {
            intensity = 2.5; 
            if (isBlackoutMode || isFullyBlack) return; 
            targetLetter.classList.add('letter-shake-single');
            setTimeout(() => { targetLetter.classList.remove('letter-shake-single'); }, 300);

        } else if (e.detail === 2) {
            intensity = 2.5; 
            if (isReadyForFall || isFalling) return; 

            isBlackoutMode = true;
            let maxDelay = 0;

            letterSpans.forEach((s, idx) => {
                const distance = Math.abs(idx - selfIndex);
                const delay = distance * 100; 
                if (delay > maxDelay) maxDelay = delay;
                setTimeout(() => { s.classList.add('letter-blackened'); }, delay);
            });

            setTimeout(() => {
                isFullyBlack = true;
                isReadyForFall = true; 
                isBlackoutMode = false; 
            }, maxDelay + 100);
        }
    });
});

// --- ANIMACIÓN DE EXPANSIÓN Y NAVEGACIÓN ---
const transitionGlow = document.getElementById('transitionGlow');
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        
        // El brillo blanco nace del sol y se expande
        transitionGlow.classList.add('expanding');

        setTimeout(() => {
            // Ocultamos la Home screen
            document.getElementById('home').classList.remove('active-screen');
            document.querySelectorAll('.screen').forEach(s => {
                s.style.display = 'none';
                s.classList.remove('animate-fall'); // Limpieza preventiva
            });
            
            // Levantamos la pantalla blanca correspondiente
            const nextScreen = document.getElementById('screen-' + targetId);
            nextScreen.style.display = 'flex';
            nextScreen.classList.add('animate-fall'); // Inyecta la animación de caída al h1
            
            // Retiramos el overlay blanco
            transitionGlow.classList.remove('expanding');
        }, 1200);
    });
});

// Volver a la pantalla principal
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        transitionGlow.classList.add('expanding');
        setTimeout(() => {
            document.querySelectorAll('.screen').forEach(s => {
                s.style.display = 'none';
                s.classList.remove('animate-fall'); // Quita la clase para que pueda repetirse
            });
            const homeScreen = document.getElementById('home');
            homeScreen.classList.add('active-screen');
            homeScreen.style.display = 'block';
            transitionGlow.classList.remove('expanding');
        }, 1200);
    });
});

// --- Botón Secreto Sandbox ---
const sunHitArea = document.getElementById('sunHitArea');
const sandboxSecret = document.getElementById('sandboxSecret');

sunHitArea.addEventListener('click', () => {
    sandboxSecret.classList.toggle('sandbox-revealed');
    intensity = sandboxSecret.classList.contains('sandbox-revealed') ? 2.0 : 1.0;
});