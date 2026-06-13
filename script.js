// --- FORZAR EL SCROLL AL INICIO AL RECARGAR PÁGINA ---
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.addEventListener('load', () => {
    window.scrollTo(0, 0);
});

// --- Audio e Interacción Inicial ---
const bgMusic = document.getElementById('bgMusic');
let audioStarted = false;

const btnAceptar = document.getElementById('btnAceptar');
btnAceptar.addEventListener('click', () => {
    document.getElementById('introScreen').classList.add('hidden');
    document.body.classList.add('scroll-allowed');
    if (!audioStarted && bgMusic) {
        const toggleSonido = document.getElementById('toggle-sonido');
        if (toggleSonido && toggleSonido.classList.contains('active')) {
            bgMusic.play().catch(e => console.log("Audio block"));
        }
        audioStarted = true;
    }
});

// --- Controles Inferiores (Sonido) ---
const toggles = document.querySelectorAll('.toggle-wrapper');
toggles.forEach(t => {
    t.addEventListener('click', () => {
        t.classList.toggle('active');
        
        if (t.id === 'toggle-sonido' && bgMusic) {
            if (t.classList.contains('active')) {
                const homeSection = document.getElementById('home');
                const rect = homeSection.getBoundingClientRect();
                if (rect.top >= -window.innerHeight / 2) {
                    bgMusic.play().catch(e => console.log("Esperando interacción manual"));
                }
            } else {
                bgMusic.pause();
            }
        }
    });
});

// --- NAVEGACIÓN DESDE EL MENÚ PRINCIPAL ---
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// --- BOTÓN FINAL: VOLVER AL INICIO ---
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// --- LÓGICA DEL INDICADOR DE SECCIÓN Y TOOLTIP ---
const sectionIndicator = document.getElementById('sectionIndicator');
const indicatorText = document.getElementById('indicatorText');
const indicatorTooltip = document.getElementById('indicatorTooltip');

let currentSectionName = '';
let hasSeenTooltip = false; 

sectionIndicator.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    indicatorTooltip.classList.remove('show-tooltip'); 
});

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            let newText = '';
            
            if (sectionId === 'concepto') newText = 'Juego de mesa';
            if (sectionId === 'experimental') newText = 'Fundamento';
            if (sectionId === 'referencia') newText = 'Referencias';

            if (newText !== currentSectionName && newText !== '') {
                sectionIndicator.classList.add('visible');
                
                if (!hasSeenTooltip) {
                    indicatorTooltip.classList.add('show-tooltip');
                    hasSeenTooltip = true;
                    setTimeout(() => {
                        indicatorTooltip.classList.remove('show-tooltip');
                    }, 4000);
                }

                if (indicatorText.textContent === '') {
                    indicatorText.textContent = newText;
                } else {
                    indicatorText.classList.add('animating-out');
                    setTimeout(() => {
                        indicatorText.textContent = newText;
                        indicatorText.classList.remove('animating-out');
                        indicatorText.classList.add('animating-in');
                        void indicatorText.offsetWidth; 
                        indicatorText.classList.remove('animating-in');
                    }, 300); 
                }
                currentSectionName = newText;
            }
        }
    });
}, { 
    rootMargin: "-20% 0px -75% 0px", 
    threshold: 0 
});

document.querySelectorAll('.new-section').forEach(sec => {
    sectionObserver.observe(sec);
});

window.addEventListener('scroll', () => {
    if (window.scrollY < window.innerHeight * 0.5) {
        sectionIndicator.classList.remove('visible');
        currentSectionName = '';
        indicatorTooltip.classList.remove('show-tooltip'); 
    }
});

// --- Intersection Observer para Música ---
const homeAudioObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const toggleSonido = document.getElementById('toggle-sonido');
        if (entry.isIntersecting) {
            if (audioStarted && bgMusic && toggleSonido?.classList.contains('active')) {
                bgMusic.play();
            }
        } else {
            bgMusic?.pause();
        }
    });
}, { threshold: 0.4 });
homeAudioObserver.observe(document.getElementById('home'));

// --- Tipografía Inestable & Físicas de Demolición ---
const gravitudTitle = document.getElementById('gravitudTitle');
if(gravitudTitle) {
    const text = gravitudTitle.textContent;
    gravitudTitle.innerHTML = ''; 
    text.split('').forEach((char, i) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.setAttribute('data-index', i); 
        gravitudTitle.appendChild(span);
    });
}
const letterSpans = gravitudTitle?.querySelectorAll('span') || [];
let clickFase = 0; 

setInterval(() => {
    if (clickFase === 0 && letterSpans.length > 0) {
        const randomIndex = Math.floor(Math.random() * letterSpans.length);
        const randomLetter = letterSpans[randomIndex];
        
        randomLetter.classList.add('letter-nudge');
        setTimeout(() => { randomLetter.classList.remove('letter-nudge'); }, 800);
    }
}, 5000);

gravitudTitle?.addEventListener('click', (e) => {
    if (clickFase === 0) {
        clickFase = 1;
        gravitudTitle.style.animation = 'none';

        for (let i = letterSpans.length - 1; i >= 0; i--) {
            const s = letterSpans[i];
            const delay = (letterSpans.length - 1 - i) * 80; 
            setTimeout(() => { s.classList.add('letter-blackened'); }, delay);
        }

    } 
    else if (clickFase === 1) {
        clickFase = 2;
        const ball = document.getElementById('wreckingBall');
        
        ball.classList.add('swing-in');

        setTimeout(() => {
            const reversedLetters = [...letterSpans].reverse();

            reversedLetters.forEach((s, i) => {
                const delayExplosion = i * 30; 
                
                setTimeout(() => {
                    s.style.color = '#1a0a0b'; 
                    s.className = ''; 
                    s.style.animation = 'none'; 
                    void s.offsetWidth; 
                    
                    s.style.transition = 'transform 1.2s cubic-bezier(0.1, 0.9, 0.2, 1)';
                    
                    const dirX = -(Math.random() * 2000 + 1000); 
                    const dirY = -(Math.random() * 1000 + 500);  
                    const endY = window.innerHeight + 1500;      
                    
                    const rotMid = (Math.random() - 0.5) * 1000;
                    const rotEnd = rotMid + (Math.random() - 0.5) * 2000;
                    const finalScale = Math.random() * 1.5 + 0.5;
                    
                    s.style.setProperty('--explode-x-mid', `${dirX * 0.4}px`); 
                    s.style.setProperty('--explode-y-mid', `${dirY}px`);
                    s.style.setProperty('--explode-rot-mid', `${rotMid}deg`);
                    
                    s.style.setProperty('--explode-x-end', `${dirX}px`);
                    s.style.setProperty('--explode-y-end', `${endY}px`);
                    s.style.setProperty('--explode-rot-end', `${rotEnd}deg`);
                    s.style.setProperty('--explode-scale', finalScale);

                    s.style.animation = `explode-letter 1.2s forwards`;
                    
                }, delayExplosion);
            });

            setTimeout(() => {
                const transScreen = document.getElementById('transitionScreen');
                transScreen.classList.remove('hidden');
                
                setTimeout(() => {
                    window.location.href = 'experimento.html'; 
                }, 2000);

            }, 1000); 

        }, 900); 
    }
});

letterSpans.forEach(span => {
    span.addEventListener('mouseover', (e) => {
        if(clickFase === 0) {
            e.target.classList.remove('letter-fading');
            e.target.style.transitionDelay = '0s'; 
            e.target.classList.add('letter-shadowed');
        }
    });
    
    span.addEventListener('mouseout', (e) => {
        if(clickFase === 0) {
            e.target.classList.remove('letter-shadowed');
            e.target.classList.add('letter-fading');
            e.target.style.transitionDelay = (e.target.dataset.index * 0.15) + 's'; 
            setTimeout(() => {
                e.target.classList.remove('letter-fading');
                e.target.style.transitionDelay = '0s';
            }, (e.target.dataset.index * 150) + 1500);
        }
    });
});

// --- Observer para Animaciones de Scroll ---
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.15 });
document.querySelectorAll('.scroll-anim').forEach(el => scrollObserver.observe(el));

// --- Modal de Video ---
const videoModal = document.getElementById('videoModal');
const modalVideo = document.getElementById('modalVideo');
const closeModalBtn = document.getElementById('closeModal');

document.querySelectorAll('.interactive-card').forEach(card => {
    card.addEventListener('click', () => {
        const videoSrc = card.getAttribute('data-video');
        if (videoSrc) {
            modalVideo.src = videoSrc;
            videoModal.classList.add('active');
            modalVideo.play();
        }
    });
});

videoModal?.addEventListener('click', (e) => { if (e.target === videoModal) closeVideo(); });
if(closeModalBtn) closeModalBtn.addEventListener('click', closeVideo);

function closeVideo() {
    videoModal.classList.remove('active');
    modalVideo.pause();
    modalVideo.currentTime = 0; 
}

// --- Colores Piezas 3D ---
const paletaColores = ['#8C2041', '#A6DDE5', '#FEFBF2', '#F5BEBF']; 
function activarCambioColor(elemento) {
    if (!elemento) return;
    
    let currentColorIndex = 0; 
    
    elemento.parentElement.addEventListener('click', () => {
        currentColorIndex = (currentColorIndex + 1) % paletaColores.length;
        elemento.style.setProperty('--piece-color', paletaColores[currentColorIndex]);
    });
}
activarCambioColor(document.getElementById('piezaEstandar'));
activarCambioColor(document.getElementById('piezaEspecial'));

// --- Efecto Nombre ---
document.querySelectorAll('.dev-name-line').forEach(line => {
    const nameText = line.textContent;
    line.innerHTML = ''; 
    nameText.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.innerHTML = char === ' ' ? '&nbsp;' : char;
        span.setAttribute('data-index', index); 
        span.style.display = 'inline-block';
        span.style.transition = 'color 0.15s ease-out, text-shadow 0.15s ease-out';
        line.appendChild(span);
    });

    line.querySelectorAll('span').forEach(span => {
        span.addEventListener('mouseover', (e) => {
            e.target.classList.remove('name-letter-fading');
            e.target.style.transitionDelay = '0s'; 
            e.target.classList.add('name-letter-hovered');
        });
        span.addEventListener('mouseout', (e) => {
            e.target.classList.remove('name-letter-hovered');
            e.target.classList.add('name-letter-fading');
            e.target.style.transitionDelay = (e.target.dataset.index * 0.05) + 's'; 
            setTimeout(() => {
                e.target.classList.remove('name-letter-fading');
                e.target.style.transitionDelay = '0s';
            }, (e.target.dataset.index * 50) + 1500);
        });
    });
});

// --- LÓGICA DE ENSAMBLE: PIEZAS INFERIORES ---
const bottomPiecesContainer = document.querySelector('.bottom-pieces');
const platformItem = document.querySelector('.platform-item');
const pillarItem = document.querySelector('.pillar-item');
const baseItem = document.querySelector('.base-item');

if (bottomPiecesContainer && platformItem && pillarItem && baseItem) {
    let isAssembled = false;
    
    const toggleAssembly = () => {
        isAssembled = !isAssembled;
        if (isAssembled) {
            bottomPiecesContainer.classList.add('is-assembled');
        } else {
            bottomPiecesContainer.classList.remove('is-assembled');
        }
    };

    [platformItem, pillarItem, baseItem].forEach(item => {
        const scene = item.querySelector('.scene3d');
        if (scene) {
            scene.addEventListener('click', toggleAssembly);
        }
    });
}