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

// --- EFECTO CAÍDA LIBRE (SCROLL ACELERADO) ---
function freeFallTo(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const startPos = window.pageYOffset;
    const targetPos = target.getBoundingClientRect().top + startPos;
    const distance = targetPos - startPos;
    let startTime = null;

    const duration = Math.min(1500, Math.max(800, distance / 2));

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        
        const progress = Math.min(timeElapsed / duration, 1);
        const easeInQuint = progress * progress * progress * progress * progress;
        
        window.scrollTo(0, startPos + (distance * easeInQuint));

        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    }
    requestAnimationFrame(animation);
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        freeFallTo(targetId);
    });
});

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// --- Intersection Observer para Música ---
const homeObserver = new IntersectionObserver((entries) => {
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
homeObserver.observe(document.getElementById('home'));

// --- Tipografía Inestable & Físicas de Demolición Balística ACELERADAS ---
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
    
    // FASE 1: Inestabilidad Crítica (El blackout fluye de derecha a izquierda)
    if (clickFase === 0) {
        clickFase = 1;
        gravitudTitle.style.animation = 'none';

        // Las letras tiemblan intensamente una por una de derecha a izquierda
        for (let i = letterSpans.length - 1; i >= 0; i--) {
            const s = letterSpans[i];
            const delay = (letterSpans.length - 1 - i) * 80; 
            setTimeout(() => { s.classList.add('letter-blackened'); }, delay);
        }

    } 
    // FASE 2: La Bola de Demolición (GOLPE EN EL EXTREMO DERECHO & EXPLOSIÓN RÁPIDA A LA IZQ)
    else if (clickFase === 1) {
        clickFase = 2;
        const ball = document.getElementById('wreckingBall');
        
        ball.classList.add('swing-in');

        // MOMENTO DEL IMPACTO (60% de 1.5s = 900ms exactos en la letra 'D')
        setTimeout(() => {
            
            // Invertimos la lista para que la 'D' sea golpeada primero y la 'G' al final
            const reversedLetters = [...letterSpans].reverse();

            reversedLetters.forEach((s, i) => {
                
                // Efecto Dominó Ultra Rápido (30ms entre cada letra)
                const delayExplosion = i * 30; 
                
                setTimeout(() => {
                    s.style.color = '#1a0a0b'; 
                    s.className = ''; 
                    s.style.animation = 'none'; 
                    
                    // ! TRUCO DE REFLOW: Congela a la GPU y previene tirones en el DOM
                    void s.offsetWidth; 
                    
                    // Animación individual de las letras reducida a 1.2s
                    s.style.transition = 'transform 1.2s cubic-bezier(0.1, 0.9, 0.2, 1)';
                    
                    // CÁLCULO BALÍSTICO DE IMPACTO DERECHO
                    // El golpe viene de la DERECHA, la metralla vuela fuerte hacia la IZQUIERDA (-) y ARRIBA (-)
                    const dirX = -(Math.random() * 2000 + 1000); // 1000 a 3000px a la Izquierda
                    const dirY = -(Math.random() * 1000 + 500);  // Salto violento arriba
                    const endY = window.innerHeight + 1500;      // Caída al fondo del pozo
                    
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

            // Transición veloz a la siguiente pantalla sin perder tiempo
            setTimeout(() => {
                const transScreen = document.getElementById('transitionScreen');
                transScreen.classList.remove('hidden');
                
                setTimeout(() => {
                    window.location.href = 'experimento.html'; 
                }, 2000);

            }, 1000); 

        }, 900); // El milisegundo exacto del impacto calculado desde el CSS (1.5s * 0.6)
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
const paletaColores = ['#8C2041', '#FEFBF2', '#A6DDE5', '#F5BEBF'];
function activarCambioColor(elemento) {
    if (!elemento) return;
    let currentColorIndex = elemento.id === 'piezaEspecial' ? 2 : 0; 
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