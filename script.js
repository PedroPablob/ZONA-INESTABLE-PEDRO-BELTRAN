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
            
            if (sectionId === 'intro-juego') newText = 'El Juego';
            if (sectionId === 'reglas') newText = 'Cómo se juega';
            if (sectionId === 'mecanicas') newText = 'Mecánicas Físicas';
            if (sectionId === 'componentes') newText = 'Componentes';
            if (sectionId === 'galeria') newText = 'Registro físico';
            if (sectionId === 'pix-section') newText = 'Partitura PIX';
            if (sectionId === 'fundamento') newText = 'Fundamento';
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
        span.innerHTML = char === ' ' ? '&nbsp;' : char;
        span.setAttribute('data-index', i); 
        gravitudTitle.appendChild(span);
    });
}
const letterSpans = gravitudTitle?.querySelectorAll('span') || [];
let clickFase = 0; 

setInterval(() => {
    if (clickFase === 0 && letterSpans.length > 0) {
        const validSpans = Array.from(letterSpans).filter(span => span.textContent.trim() !== '');
        if (validSpans.length > 0) {
            const randomIndex = Math.floor(Math.random() * validSpans.length);
            const randomLetter = validSpans[randomIndex];
            randomLetter.classList.add('letter-nudge');
            setTimeout(() => { randomLetter.classList.remove('letter-nudge'); }, 800);
        }
    }
}, 5000);

gravitudTitle?.addEventListener('click', (e) => {
    if (clickFase === 0) {
        clickFase = 1;
        gravitudTitle.style.animation = 'none';

        for (let i = letterSpans.length - 1; i >= 0; i--) {
            const s = letterSpans[i];
            if (s.textContent.trim() !== '') {
                const delay = (letterSpans.length - 1 - i) * 80; 
                setTimeout(() => { s.classList.add('letter-blackened'); }, delay);
            }
        }

    } 
    else if (clickFase === 1) {
        clickFase = 2;
        const ball = document.getElementById('wreckingBall');
        ball.classList.add('swing-in');

        setTimeout(() => {
            const reversedLetters = [...letterSpans].reverse();

            reversedLetters.forEach((s, i) => {
                if (s.textContent.trim() !== '') {
                    const delayExplosion = i * 30; 
                    setTimeout(() => {
                        s.style.color = '#9c3d42'; 
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
                }
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
    if (span.textContent.trim() !== '') {
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
    }
});

// --- Observer para Animaciones de Scroll ---
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.15 });
document.querySelectorAll('.scroll-anim').forEach(el => scrollObserver.observe(el));


// --- LÓGICA REPRODUCTOR DE VIDEO EN LÍNEA ---
const inlineVideoContainer = document.getElementById('inlineVideoContainer');
const inlineVideoPlayer = document.getElementById('inlineVideoPlayer');
const closeInlineVideoBtn = document.getElementById('closeInlineVideo');
const inlineVideoTitle = document.getElementById('inlineVideoTitle');
const prevVideoBtn = document.getElementById('prevVideoBtn');
const nextVideoBtn = document.getElementById('nextVideoBtn');

const uiColors = ['#A6DDE5', '#F5BEBF', '#9c3d42']; 
let currentVideoIndex = 0;
let videoDataList = [];

document.querySelectorAll('.interactive-card').forEach((card, index) => {
    const videoSrc = card.getAttribute('data-video');
    const title = card.querySelector('h3').textContent;
    if(videoSrc) {
        videoDataList.push({ src: videoSrc, title: title });
        
        card.addEventListener('click', () => {
            currentVideoIndex = index;
            playCurrentVideo();
            inlineVideoContainer.classList.add('active');
            setTimeout(() => {
                inlineVideoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    }
});

function playCurrentVideo() {
    if(videoDataList.length === 0) return;
    
    const data = videoDataList[currentVideoIndex];
    inlineVideoPlayer.src = data.src;
    if(inlineVideoTitle) inlineVideoTitle.textContent = data.title;
    inlineVideoPlayer.play();
    
    const randomColor = uiColors[Math.floor(Math.random() * uiColors.length)];
    inlineVideoTitle.style.color = randomColor;
    prevVideoBtn.style.color = randomColor;
    nextVideoBtn.style.color = randomColor;
}

if(prevVideoBtn) {
    prevVideoBtn.addEventListener('click', () => {
        currentVideoIndex = (currentVideoIndex - 1 + videoDataList.length) % videoDataList.length;
        playCurrentVideo();
    });
}

if(nextVideoBtn) {
    nextVideoBtn.addEventListener('click', () => {
        currentVideoIndex = (currentVideoIndex + 1) % videoDataList.length;
        playCurrentVideo();
    });
}

if(closeInlineVideoBtn) {
    closeInlineVideoBtn.addEventListener('click', () => {
        inlineVideoContainer.classList.remove('active');
        inlineVideoPlayer.pause();
        inlineVideoPlayer.currentTime = 0; 
    });
}

// --- Colores Piezas 3D ---
const paletaColores = ['#A6DDE5', '#9c3d42', '#ffffff', '#F5BEBF'];
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

// --- LÓGICA DE ENSAMBLE PLATAFORMA ---
const individualPieces = document.querySelectorAll('.individual-piece');
const assembledItem = document.querySelector('.assembled-item');

if (individualPieces.length > 0 && assembledItem) {
    const toggleAssembly = () => {
        const isAssembled = assembledItem.style.display === 'flex';
        if (!isAssembled) {
            individualPieces.forEach(item => item.style.display = 'none');
            assembledItem.style.display = 'flex';
        } else {
            assembledItem.style.display = 'none';
            individualPieces.forEach(item => item.style.display = 'flex');
        }
    };

    individualPieces.forEach(item => {
        const scene = item.querySelector('.scene3d');
        if (scene) scene.addEventListener('click', toggleAssembly);
    });
    
    const assembledScene = assembledItem.querySelector('.scene3d');
    if (assembledScene) assembledScene.addEventListener('click', toggleAssembly);
}

// --- LÓGICA CAÑA EXTENSORA Y BOLA DE DEMOLICIÓN ---
const canaWrapper = document.querySelector('.cana-wrapper');
if (canaWrapper) {
    const cerrada = canaWrapper.querySelector('.cana-cerrada-scene');
    const extendida = canaWrapper.querySelector('.cana-extendida-scene');

    const toggleCana = (e) => {
        if (e.target.closest('.bola-3d')) return; 
        const isClosed = cerrada.style.display !== 'none';
        if (isClosed) {
            cerrada.style.display = 'none';
            extendida.style.display = 'flex';
        } else {
            extendida.style.display = 'none';
            cerrada.style.display = 'flex';
        }
    };
    
    if (cerrada) cerrada.addEventListener('click', toggleCana);
    if (extendida) extendida.addEventListener('click', toggleCana);
}

const bolas = document.querySelectorAll('.bola-3d');
bolas.forEach(bola => {
    bola.addEventListener('click', (e) => {
        e.stopPropagation(); 
        bolas.forEach(b => b.classList.toggle('bola-negra'));
    });
});

// --- LÓGICA DEL MENÚ DE REGLAS ---
const timelineBtns = document.querySelectorAll('.timeline-btn');
const rulePanels = document.querySelectorAll('.rule-panel');

timelineBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        timelineBtns.forEach(b => b.classList.remove('active'));
        rulePanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        
        const targetId = btn.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    });
});

// --- LÓGICA DESPLEGABLE MATRIZ PIX ---
const btnPix = document.getElementById('btnPix');
const pixMatrix = document.getElementById('pixMatrix');

if (btnPix && pixMatrix) {
    btnPix.addEventListener('click', () => {
        const isOpen = pixMatrix.classList.contains('open');
        const iframe = pixMatrix.querySelector('.pix-viewer');
        
        if (!isOpen) {
            pixMatrix.classList.add('open');
            btnPix.textContent = 'CERRAR MATRIZ PIX';
            
            // Forzar un pequeño redraw del iframe en caso de que esté suspendido
            if (iframe) {
                const currentSrc = iframe.src;
                iframe.src = '';
                setTimeout(() => { iframe.src = currentSrc; }, 10);
            }
            
            setTimeout(() => {
                pixMatrix.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        } else {
            pixMatrix.classList.remove('open');
            btnPix.textContent = 'DESPLEGAR MATRIZ PIX';
        }
    });
}

// --- LÓGICA MODAL DE IMÁGENES (GALERÍA) ---
const imageModal = document.getElementById('imageModal');
const modalExpandedImg = document.getElementById('modalExpandedImg');
const closeImageModalBtn = document.getElementById('closeImageModal');
const galleryItems = document.querySelectorAll('.gallery-item');

galleryItems.forEach(item => {
    item.addEventListener('click', () => {
        const img = item.querySelector('.gallery-img');
        if (img && img.getAttribute('src')) {
            modalExpandedImg.src = img.src;
            imageModal.classList.add('active');
        }
    });
});

imageModal?.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.classList.remove('active');
    }
});

if (closeImageModalBtn) {
    closeImageModalBtn.addEventListener('click', () => {
        imageModal.classList.remove('active');
    });
}

// --- LÓGICA LLUVIA DE FORMAS GEOMÉTRICAS ---
const quoteBand = document.getElementById('quoteBand');
const shapesContainer = document.getElementById('fallingShapesContainer');
let shapesGenerated = false;

const bandObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !shapesGenerated) {
            generateShapes();
            shapesGenerated = true;
        }
    });
}, { threshold: 0.3 });

if(quoteBand) bandObserver.observe(quoteBand);

function generateShapes() {
    const numShapes = 35; 
    const colors = ['#9c3d42', '#A6DDE5', '#F5BEBF']; 
    const types = ['shape-rect', 'shape-hex'];

    for (let i = 0; i < numShapes; i++) {
        const shape = document.createElement('div');
        const type = types[Math.floor(Math.random() * types.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];

        shape.classList.add('falling-shape', type);
        shape.style.backgroundColor = color;

        const size = Math.random() * 60 + 40; 
        shape.style.width = `${size}px`;
        shape.style.height = type === 'shape-rect' && Math.random() > 0.5 ? `${size * 1.5}px` : `${size}px`; 

        const finalX = Math.random() * 95; 
        const finalY = Math.random() * 85; 
        const finalRot = Math.random() * 360;
        const finalScale = Math.random() * 0.8 + 0.5;
        const delay = Math.random() * 0.8; 

        shape.style.setProperty('--final-x', `${finalX}%`);
        shape.style.setProperty('--final-y', `${finalY}%`);
        shape.style.setProperty('--final-rot', `${finalRot}deg`);
        shape.style.setProperty('--final-scale', finalScale);
        shape.style.animationDelay = `${delay}s`;

        shapesContainer.appendChild(shape);
    }
}