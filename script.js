// --- FORZAR EL SCROLL AL INICIO AL RECARGAR PÁGINA ---
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.addEventListener('load', () => {
    window.scrollTo(0, 0);
});

// --- Audio e Interacción Inicial ---
const bgMusic = document.getElementById('bgMusic');

const btnAceptar = document.getElementById('btnAceptar');
if (btnAceptar) {
    btnAceptar.addEventListener('click', () => {
        document.getElementById('introScreen').classList.add('hidden');
        document.body.classList.add('scroll-allowed');
    });
}

// --- Controles Inferiores (Sonido) ---
const toggles = document.querySelectorAll('.toggle-wrapper');
toggles.forEach(t => {
    t.addEventListener('click', () => {
        t.classList.toggle('active');
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

// --- LÓGICA DEL BOTÓN FLOTANTE "VOLVER" ---
const sectionIndicator = document.getElementById('sectionIndicator');
if (sectionIndicator) {
    sectionIndicator.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > window.innerHeight * 0.5) {
            sectionIndicator.classList.add('visible');
        } else {
            sectionIndicator.classList.remove('visible');
        }
    });
}

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

// Microinteracción sutil de letras flotantes (fase de espera)
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

if (gravitudTitle) {
    gravitudTitle.addEventListener('click', (e) => {
        // PRIMER CLIC: Efecto de ola expansiva sin letras atascadas
        if (clickFase === 0) {
            clickFase = 1;
            gravitudTitle.style.animation = 'none';

            let clickedIndex = Math.floor(letterSpans.length / 2); 
            if (e.target.tagName.toLowerCase() === 'span') {
                clickedIndex = parseInt(e.target.getAttribute('data-index'));
            }

            letterSpans.forEach((s) => {
                if (s.textContent.trim() !== '') {
                    const currentIndex = parseInt(s.getAttribute('data-index'));
                    const distance = Math.abs(currentIndex - clickedIndex);
                    const delay = distance * 40; 
                    
                    setTimeout(() => { 
                        // Limpiamos transiciones de hover para evitar conflictos
                        s.style.transition = 'none';
                        s.style.transitionDelay = '0s';
                        
                        s.className = ''; 
                        s.classList.add('letter-blackened'); 
                    }, delay);
                }
            });

        } 
        // SEGUNDO CLIC: Cae la grúa y suena el golpe sincronizado
        else if (clickFase === 1) {
            clickFase = 2;
            const ball = document.getElementById('wreckingBall');
            if (ball) ball.classList.add('swing-in');

            setTimeout(() => {
                const toggleSonido = document.getElementById('toggle-sonido');
                if (bgMusic && toggleSonido?.classList.contains('active')) {
                    bgMusic.currentTime = 0; 
                    bgMusic.play().catch(err => console.log("Error al reproducir el golpe:", err));
                }

                const reversedLetters = [...letterSpans].reverse();
                reversedLetters.forEach((s, i) => {
                    if (s.textContent.trim() !== '') {
                        const delayExplosion = i * 30; 
                        setTimeout(() => {
                            s.style.color = '#000000'; 
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
                    if (transScreen) transScreen.classList.remove('hidden');
                    setTimeout(() => {
                        window.location.href = 'experimento.html'; 
                    }, 2000);
                }, 1000); 

            }, 900); 
        }
    });
}

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

// --- Lógica Botón CTA Footer ---
const btnIrExperiencia = document.getElementById('btnIrExperiencia');
if(btnIrExperiencia) {
    btnIrExperiencia.addEventListener('click', () => {
        const transScreen = document.getElementById('transitionScreen');
        if (transScreen) transScreen.classList.remove('hidden');
        setTimeout(() => {
            window.location.href = 'experimento.html'; 
        }, 1500);
    });
}

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
            if (inlineVideoContainer) {
                inlineVideoContainer.classList.add('active');
                setTimeout(() => {
                    inlineVideoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
    }
});

function playCurrentVideo() {
    if(videoDataList.length === 0 || !inlineVideoPlayer) return;
    
    const data = videoDataList[currentVideoIndex];
    inlineVideoPlayer.src = data.src;
    if(inlineVideoTitle) inlineVideoTitle.textContent = data.title;
    inlineVideoPlayer.play();
    
    const randomColor = uiColors[Math.floor(Math.random() * uiColors.length)];
    if(inlineVideoTitle) inlineVideoTitle.style.color = randomColor;
    if(prevVideoBtn) prevVideoBtn.style.color = randomColor;
    if(nextVideoBtn) nextVideoBtn.style.color = randomColor;
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
        if (inlineVideoContainer) inlineVideoContainer.classList.remove('active');
        if (inlineVideoPlayer) {
            inlineVideoPlayer.pause();
            inlineVideoPlayer.currentTime = 0; 
        }
    });
}

// --- Colores Piezas 3D ---
const paletaColores = ['#A6DDE5', '#9c3d42', '#ffffff', '#F5BEBF'];
function activarCambioColor(elemento) {
    if (!elemento || !elemento.parentElement) return;
    let currentColorIndex = 0; 
    elemento.parentElement.addEventListener('click', () => {
        currentColorIndex = (currentColorIndex + 1) % paletaColores.length;
        elemento.style.setProperty('--piece-color', paletaColores[currentColorIndex]);
    });
}
activarCambioColor(document.getElementById('piezaEstandar'));
activarCambioColor(document.getElementById('piezaEspecial'));

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

// --- LÓGICA DESPLEGABLE MATRIZ PIX 1 (JUEGO MESA) ---
const btnPixFisico = document.getElementById('btnPixFisico');
const pixMatrixFisico = document.getElementById('pixMatrixFisico');

if (btnPixFisico && pixMatrixFisico) {
    btnPixFisico.addEventListener('click', () => {
        const isOpen = pixMatrixFisico.classList.contains('open');
        const iframe = pixMatrixFisico.querySelector('.pix-viewer');
        
        if (!isOpen) {
            pixMatrixFisico.classList.add('open');
            btnPixFisico.textContent = 'Cerrar Pix';
            
            if (iframe) {
                const currentSrc = iframe.getAttribute('src');
                setTimeout(() => {
                    iframe.src = currentSrc;
                }, 300); 
            }
            
            setTimeout(() => {
                pixMatrixFisico.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        } else {
            pixMatrixFisico.classList.remove('open');
            btnPixFisico.textContent = 'Desplegar Pix';
        }
    });
}

// --- LÓGICA DESPLEGABLE MATRIZ PIX 2 (FUNDAMENTO DIGITAL) ---
const btnPixFundamento = document.getElementById('btnPixFundamento');
const pixMatrixFundamento = document.getElementById('pixMatrixFundamento');

if (btnPixFundamento && pixMatrixFundamento) {
    btnPixFundamento.addEventListener('click', () => {
        const isOpen = pixMatrixFundamento.classList.contains('open');
        const iframe = pixMatrixFundamento.querySelector('iframe');
        
        if (!isOpen) {
            pixMatrixFundamento.classList.add('open');
            btnPixFundamento.textContent = 'Cerrar Pix';
            
            if (iframe) {
                const currentSrc = iframe.getAttribute('src');
                setTimeout(() => {
                    iframe.src = currentSrc;
                }, 300);
            }
            
            setTimeout(() => {
                pixMatrixFundamento.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        } else {
            pixMatrixFundamento.classList.remove('open');
            btnPixFundamento.textContent = 'Desplegar Pix';
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
            if (modalExpandedImg) modalExpandedImg.src = img.src;
            if (imageModal) imageModal.classList.add('active');
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
        if (imageModal) imageModal.classList.remove('active');
    });
}

// --- LÓGICA LLUVIA DE FORMAS GEOMÉTRICAS REUTILIZABLE ---
function setupFallingShapes(sectionId, numShapes) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    let shapesGenerated = false;
    const shapesContainer = section.querySelector('.falling-shapes-container');
    if (!shapesContainer) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !shapesGenerated) {
                generateShapes(shapesContainer, numShapes);
                shapesGenerated = true;
            }
        });
    }, { threshold: 0.3 });
    
    observer.observe(section);
}

function generateShapes(container, numShapes) {
    const colors = ['#9c3d42', '#A6DDE5', '#F5BEBF']; 
    const types = ['shape-rect', 'shape-hex'];

    for (let i = 0; i < numShapes; i++) {
        const shape = document.createElement('div');
        const type = types[Math.floor(Math.random() * types.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];

        shape.classList.add('falling-shape', type);
        shape.style.backgroundColor = color;

        const size = Math.random() * 35 + 25; 
        shape.style.width = `${size}px`;
        shape.style.height = type === 'shape-rect' && Math.random() > 0.5 ? `${size * 1.2}px` : `${size}px`; 

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

        container.appendChild(shape);
    }
}

// Inicializar la lluvia de formas en ambas secciones
setupFallingShapes('quoteBand', 35);
setupFallingShapes('cta-experiencia', 40);