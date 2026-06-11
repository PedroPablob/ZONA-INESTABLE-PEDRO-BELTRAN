// --- Elementos de Audio e Interacción ---
const bgMusic = document.getElementById('bgMusic');
let audioStarted = false;

// --- LÓGICA DE LA PANTALLA DE INTRODUCCIÓN ---
const introScreen = document.getElementById('introScreen');
const btnAceptar = document.getElementById('btnAceptar');

btnAceptar.addEventListener('click', () => {
    // Ocultar la pantalla de advertencia
    introScreen.classList.add('hidden');
    
    // Iniciar música automáticamente al aceptar si el botón de música está activo
    if (!audioStarted && bgMusic) {
        const toggleMusica = document.getElementById('toggle-musica');
        if (toggleMusica && toggleMusica.classList.contains('active')) {
            bgMusic.play().catch(err => console.log("Autoplay bloqueado"));
        }
        audioStarted = true;
    }
});

// --- Controles y Canvas (Fondo) ---
const toggles = document.querySelectorAll('.toggle-wrapper');
toggles.forEach(t => {
    t.addEventListener('click', () => {
        t.classList.toggle('active');
        
        // Lógica específica para el botón de música
        if (t.id === 'toggle-musica' && bgMusic) {
            if (t.classList.contains('active')) {
                bgMusic.play().catch(e => console.log("Esperando interacción manual"));
            } else {
                bgMusic.pause();
            }
        }
    });
});

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
if(gravitudTitle) breakTextIntoSpans(gravitudTitle); 

const letterSpans = gravitudTitle?.querySelectorAll('span') || [];

let isBlackoutMode = false; 
let isFullyBlack = false;   
let isReadyForFall = false; 
let isFalling = false;      

gravitudTitle?.addEventListener('click', (e) => {
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
        
        // Pausar la música al entrar a una nueva sección
        if (bgMusic) bgMusic.pause();

        const targetId = link.getAttribute('data-target');
        
        transitionGlow.classList.add('expanding');

        setTimeout(() => {
            document.getElementById('home').classList.remove('active-screen');
            document.querySelectorAll('.screen').forEach(s => {
                s.style.display = 'none';
                s.classList.remove('animate-fall'); 
            });
            
            const nextScreen = document.getElementById('screen-' + targetId);
            nextScreen.style.display = 'flex';
            
            void nextScreen.offsetHeight;
            nextScreen.classList.add('animate-fall'); 
            
            transitionGlow.classList.remove('expanding');
        }, 1200);
    });
});

// Volver a la pantalla principal reseteando los estados de animación
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        
        // Reanudar la música al volver, solo si el toggle está activo
        const toggleMusica = document.getElementById('toggle-musica');
        if (bgMusic && toggleMusica && toggleMusica.classList.contains('active') && audioStarted) {
            bgMusic.play().catch(e => console.log("Autoplay bloqueado"));
        }

        transitionGlow.classList.add('expanding');
        
        setTimeout(() => {
            document.querySelectorAll('.screen').forEach(s => {
                s.style.display = 'none';
                s.classList.remove('animate-fall'); 
            });
            
            const homeScreen = document.getElementById('home');
            homeScreen.classList.add('active-screen');
            homeScreen.style.display = 'block';
            
            transitionGlow.classList.remove('expanding');
        }, 1200);

        setTimeout(() => {
            document.querySelectorAll('.scrollable-screen').forEach(screen => {
                screen.scrollTop = 0;
            });
        }, 1000); 
    });
});

// --- Botón Secreto Sandbox ---
const sunHitArea = document.getElementById('sunHitArea');
const sandboxSecret = document.getElementById('sandboxSecret');

sunHitArea.addEventListener('click', () => {
    sandboxSecret.classList.toggle('sandbox-revealed');
    intensity = sandboxSecret.classList.contains('sandbox-revealed') ? 2.0 : 1.0;
});

// --- ANIMACIÓN DE SCROLL EN PANTALLAS COMPATIBLES ---
const observeScrollableScreen = (screenId) => {
    const screenElement = document.getElementById(screenId);
    if (!screenElement) return;

    const observerOptions = {
        root: screenElement, 
        rootMargin: '0px',
        threshold: 0.15 
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    screenElement.querySelectorAll('.scroll-anim').forEach(el => {
        scrollObserver.observe(el);
    });
};

observeScrollableScreen('screen-referencia');
observeScrollableScreen('screen-concepto');

// --- LÓGICA DEL MODAL DE VIDEO ---
const videoModal = document.getElementById('videoModal');
const modalVideo = document.getElementById('modalVideo');
const closeModalBtn = document.getElementById('closeModal');
const mechanicCards = document.querySelectorAll('.interactive-card');

mechanicCards.forEach(card => {
    card.addEventListener('click', () => {
        const videoSrc = card.getAttribute('data-video');
        if (videoSrc) {
            modalVideo.src = videoSrc;
            videoModal.classList.add('active');
            modalVideo.play();
        }
    });
});

videoModal?.addEventListener('click', (e) => {
    if (e.target === videoModal) {
        closeVideo();
    }
});

if(closeModalBtn) {
    closeModalBtn.addEventListener('click', closeVideo);
}

function closeVideo() {
    videoModal.classList.remove('active');
    modalVideo.pause();
    modalVideo.currentTime = 0; 
}

// --- INTERACCIÓN DE PIEZAS 3D TALLER (COLOR CHANGE BY CLICK) ---
const paletaColores = [
    '#8C2041', // Burdeos
    '#FEFBF2', // Crema
    '#A6DDE5', // Cian
    '#F5BEBF'  // Rosa
];

const piezaEstandar = document.getElementById('piezaEstandar');
const piezaEspecial = document.getElementById('piezaEspecial');

function activarCambioColor(elemento) {
    if (!elemento) return;
    let currentColorIndex = elemento.id === 'piezaEspecial' ? 2 : 0; 

    elemento.parentElement.addEventListener('click', () => {
        currentColorIndex = (currentColorIndex + 1) % paletaColores.length;
        elemento.style.setProperty('--piece-color', paletaColores[currentColorIndex]);
    });
}

activarCambioColor(piezaEstandar);
activarCambioColor(piezaEspecial);

// --- EFECTO ESTELA CIAN EN EL NOMBRE DEL DESARROLLADOR ---
const devNameLines = document.querySelectorAll('.dev-name-line');

devNameLines.forEach(line => {
    const nameText = line.textContent;
    line.innerHTML = ''; 
    
    nameText.split('').forEach((char, index) => {
        const span = document.createElement('span');
        if (char === ' ') {
            span.innerHTML = '&nbsp;';
        } else {
            span.textContent = char;
        }
        span.setAttribute('data-index', index); 
        span.style.display = 'inline-block';
        span.style.transition = 'color 0.15s ease-out, text-shadow 0.15s ease-out';
        line.appendChild(span);
    });

    const devLetterSpans = line.querySelectorAll('span');

    devLetterSpans.forEach(span => {
        span.addEventListener('mouseover', (e) => {
            const target = e.target;
            target.classList.remove('name-letter-fading');
            target.style.transitionDelay = '0s'; 
            target.classList.add('name-letter-hovered');
        });
        
        span.addEventListener('mouseout', (e) => {
            const target = e.target;
            const index = parseInt(target.dataset.index);

            target.classList.remove('name-letter-hovered');
            target.classList.add('name-letter-fading');
            
            target.style.transitionDelay = (index * 0.05) + 's'; 

            setTimeout(() => {
                target.classList.remove('name-letter-fading');
                target.style.transitionDelay = '0s';
            }, (index * 50) + 1500);
        });
    });
});