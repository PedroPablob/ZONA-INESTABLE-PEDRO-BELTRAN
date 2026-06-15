const { Engine, Render, Runner, World, Bodies, Body, Events, Constraint, Composite } = Matter;

// CONFIGURACIÓN MÁXIMA ESTABILIDAD
const engine = Engine.create({
    positionIterations: 20, 
    velocityIterations: 15,
    enableSleeping: false 
});
const world = engine.world;

const render = Render.create({
    element: document.getElementById('canvas-container'),
    engine: engine,
    options: { 
        width: window.innerWidth, 
        height: window.innerHeight, 
        wireframes: false, 
        background: 'transparent' 
    }
});

// --- PALETA Y DATOS ---
const palette = {
    'CIAN': '#A6DDE5',
    'ROJO': '#8C2041',
    'BLANCO': '#FEFBF2',
    'ROSA': '#F5BEBF'
};
const coloresArr = Object.keys(palette);
const cMadera = '#E8D5B1';
const cNegro = '#1a0a0b';

let colorProhibido = '';
let currentLevel = 1;
let totalNiveles = 10; 
let puntos = 0; 
let cameraY = 0; 
let maxScroll = 0; 

let estadoRuleta = 'NORMAL';
let escalaActual = 1;
let juegoActivo = false;
let juegoPausado = false; 

let todasLasFichas = []; 
let todaLaEstructura = []; 

let ghostUntil = 0;

let globalMouseX = window.innerWidth / 2;
let globalMouseY = window.innerHeight / 2;
let ratonX = globalMouseX;
let ratonY = globalMouseY;

window.addEventListener('mousemove', (e) => { 
    globalMouseX = e.clientX; 
    globalMouseY = e.clientY; 
    if(!juegoPausado) { ratonX = globalMouseX; ratonY = globalMouseY; }
});

// --- GENERADOR DINÁMICO DE PATRÓN ---
function crearTexturaPlataforma(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = palette['ROSA']; 
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = palette['BLANCO'];
    
    for(let y = 0; y < h; y += 20) {
        for(let x = 0; x < w; x += 20) {
            if((Math.floor(x/20) + Math.floor(y/20)) % 2 === 0) {
                ctx.fillRect(x, y, 20, 20);
            }
        }
    }
    return canvas.toDataURL();
}

// --- CURSOR BOLA DE DEMOLICIÓN ---
const cursorFisico = Bodies.circle(ratonX, ratonY, 30, {
    isStatic: true, 
    render: { fillStyle: cNegro }, 
    collisionFilter: { group: -1 } 
});
World.add(world, cursorFisico);

function resetCursorScale() {
    if (escalaActual !== 1) {
        Body.scale(cursorFisico, 1 / escalaActual, 1 / escalaActual);
        escalaActual = 1;
        Body.setPosition(cursorFisico, { x: ratonX, y: ratonY + cameraY });
    }
}

// --- CONSTRUCTOR DE NIVELES ---
function limpiarMundo() {
    Composite.allBodies(world).forEach(body => { 
        if (body !== cursorFisico) World.remove(world, body); 
    });
    Composite.allConstraints(world).forEach(c => World.remove(world, c));
    todasLasFichas = [];
    todaLaEstructura = [];
    cameraY = 0;
    actualizarCamara();
    
    resetCursorScale();
    estadoRuleta = 'NORMAL';
    document.getElementById('ruleta-status').innerText = 'ESTABILIDAD NORMAL';
    document.getElementById('ruleta-status').classList.remove('alerta');
    cursorFisico.render.fillStyle = cNegro;
    document.getElementById('canvas-container').classList.remove('vista-cenital'); 
    
    ratonX = globalMouseX; 
    ratonY = globalMouseY;
    Body.setPosition(cursorFisico, { x: ratonX, y: ratonY + cameraY });

    ghostUntil = Date.now() + 2000;
}

function crearPlataforma(x, y, w) {
    const plat = Bodies.rectangle(x, y, w, 40, { 
        render: { sprite: { texture: crearTexturaPlataforma(w, 40), xScale: 1, yScale: 1 } },
        friction: 1, frictionStatic: 20, density: 0.3, restitution: 0 
    });
    plat.isEstructura = true; plat.caida = false;
    World.add(world, plat); todaLaEstructura.push(plat); 
    return plat;
}

function colgarPlataforma(plat, x, ancho, anclajeY = -1000) {
    World.add(world, Constraint.create({ pointA: { x: x - (ancho/2 - 20), y: anclajeY }, bodyB: plat, pointB: { x: -(ancho/2 - 20), y: 0 }, stiffness: 0.1, render: { strokeStyle: cNegro } }));
    World.add(world, Constraint.create({ pointA: { x: x + (ancho/2 - 20), y: -1000 }, bodyB: plat, pointB: { x: (ancho/2 - 20), y: 0 }, stiffness: 0.1, render: { strokeStyle: cNegro } }));
}

function crearPilar(x, y) {
    const pilar = Bodies.rectangle(x, y, 40, 100, { 
        render: { fillStyle: cMadera }, 
        friction: 1, frictionStatic: 20, density: 0.1, restitution: 0, slop: 0.02
    });
    pilar.isEstructura = true; pilar.caida = false;
    World.add(world, pilar); todaLaEstructura.push(pilar);
}

function crearFicha(x, y, colorName, isRectangle = null) {
    const isRect = (isRectangle === null) ? (Math.random() > 0.5) : isRectangle;
    
    const opcionesFicha = { 
        render: { 
            fillStyle: palette[colorName],
            strokeStyle: cNegro,
            lineWidth: 2 
        }, 
        friction: 0.9, density: 0.002, restitution: 0 
    };
    const ficha = isRect ? Bodies.rectangle(x, y, 40, 80, opcionesFicha) : Bodies.polygon(x, y, 3, 35, opcionesFicha);
    
    ficha.colorAsignado = colorName; ficha.caida = false; 
    World.add(world, ficha); todasLasFichas.push(ficha);
}

function colorEnemigoSeguro() {
    let rc; do { rc = coloresArr[Math.floor(Math.random() * coloresArr.length)]; } while (rc === colorProhibido); return rc;
}

// --- CARGADOR DE NIVELES (AHORA CON ALEATORIEDAD) ---
function cargarNivel(nivel) {
    limpiarMundo();
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight - 100;
    document.getElementById('level-indicator').innerText = `NIVEL ${nivel}`;

    if (nivel === 1) {
        maxScroll = 0; 
        const p1 = crearPlataforma(cx, cy, 600); colgarPlataforma(p1, cx, 600);
        
        // Randomizamos la posición inicial incluso en el nivel 1
        let posX = [cx - 200, cx - 100, cx + 100, cx + 200, cx - 50].sort(() => Math.random() - 0.5);
        crearFicha(posX[0], cy - 65, colorProhibido); 
        for(let i=1; i<5; i++) crearFicha(posX[i], cy - 65, colorEnemigoSeguro());
    } 
    else if (nivel === 2) {
        maxScroll = -200; 
        const p1 = crearPlataforma(cx, cy, 600); colgarPlataforma(p1, cx, 600);
        crearPilar(cx - 150, cy - 70); crearPilar(cx + 150, cy - 70);
        const p2 = crearPlataforma(cx, cy - 140, 400); 
        
        // Randomización en el Nivel 2
        let posX = [cx - 100, cx, cx + 100].sort(() => Math.random() - 0.5);
        crearFicha(posX[0], cy - 185, colorProhibido);
        crearFicha(posX[1], cy - 185, colorEnemigoSeguro());
        crearFicha(posX[2], cy - 185, colorEnemigoSeguro());
    }
    else if (nivel === 3) {
        maxScroll = -300; 
        const p1 = crearPlataforma(cx, cy, 600); colgarPlataforma(p1, cx, 600);
        crearPilar(cx - 150, cy - 70); crearPilar(cx + 150, cy - 70);
        const p2 = crearPlataforma(cx, cy - 140, 400); 
        crearPilar(cx - 80, cy - 210); crearPilar(cx + 80, cy - 210);
        const p3 = crearPlataforma(cx, cy - 280, 240); 
        
        // Randomización entre los 2 lugares altos
        let posX = [cx - 50, cx + 50].sort(() => Math.random() - 0.5);
        crearFicha(posX[0], cy - 325, colorProhibido);
        crearFicha(posX[1], cy - 325, colorEnemigoSeguro());
    }
    else if (nivel === 4) {
        maxScroll = -250; 
        const p1 = crearPlataforma(cx, cy, 800); colgarPlataforma(p1, cx, 800);
        crearPilar(cx - 200, cy - 70); crearPilar(cx, cy - 70); crearPilar(cx + 200, cy - 70);
        const p2a = crearPlataforma(cx - 150, cy - 140, 320);
        const p2b = crearPlataforma(cx + 150, cy - 140, 320);
        crearFicha(cx - 200, cy - 185, colorEnemigoSeguro()); crearFicha(cx - 100, cy - 185, colorProhibido);
        crearFicha(cx + 200, cy - 185, colorEnemigoSeguro()); crearFicha(cx + 100, cy - 185, colorEnemigoSeguro());
    }
    else if (nivel === 5) {
        maxScroll = -400; 
        const p1a = crearPlataforma(cx - 250, cy, 400); colgarPlataforma(p1a, cx - 250, 400);
        const p1b = crearPlataforma(cx + 250, cy, 400); colgarPlataforma(p1b, cx + 250, 400);
        crearPilar(cx - 300, cy - 70); crearPilar(cx - 150, cy - 70);
        crearPilar(cx + 150, cy - 70); crearPilar(cx + 300, cy - 70);
        const p2a = crearPlataforma(cx - 300, cy - 140, 200);
        const p2b = crearPlataforma(cx, cy - 140, 320); 
        const p2c = crearPlataforma(cx + 300, cy - 140, 200);
        crearPilar(cx - 100, cy - 210); crearPilar(cx + 100, cy - 210);
        const p3a = crearPlataforma(cx - 150, cy - 280, 200);
        const p3b = crearPlataforma(cx + 150, cy - 280, 200);
        
        // ¡Aleatorización del Nivel 5!
        let posX = [cx - 150, cx, cx + 150].sort(() => Math.random() - 0.5);
        crearFicha(posX[0], cy - 325, colorProhibido);
        crearFicha(posX[1], cy - 325, colorEnemigoSeguro());
        crearFicha(posX[2], cy - 325, colorEnemigoSeguro());
    }
    else if (nivel === 6) {
        maxScroll = -450;
        const baseP = crearPlataforma(cx, cy, 500); colgarPlataforma(baseP, cx, 500);
        crearPilar(cx, cy - 70);
        const pendP = crearPlataforma(cx, cy + 100, 300); colgarPlataforma(pendP, cx, 300, cy);
        
        crearFicha(cx - 150, cy - 65, colorEnemigoSeguro()); crearFicha(cx + 150, cy - 65, colorEnemigoSeguro());
        // Randomizar piezas en el péndulo inferior
        let posX = [cx - 60, cx, cx + 60].sort(() => Math.random() - 0.5);
        crearFicha(posX[0], cy + 100 - 65, colorProhibido); 
        crearFicha(posX[1], cy + 100 - 65, colorEnemigoSeguro(), true); 
        crearFicha(posX[2], cy + 100 - 65, colorEnemigoSeguro(), true);
    }
    else if (nivel === 7) {
        maxScroll = -350;
        const p1 = crearPlataforma(cx, cy, 800); colgarPlataforma(p1, cx, 800);
        crearPilar(cx, cy - 70); 
        const p2 = crearPlataforma(cx, cy - 140, 700);
        
        crearFicha(cx - 300, cy - 185, colorEnemigoSeguro(), false); crearFicha(cx + 300, cy - 185, colorEnemigoSeguro(), false);
        crearFicha(cx - 250, cy - 185, colorEnemigoSeguro(), true); crearFicha(cx + 250, cy - 185, colorEnemigoSeguro(), true);
        crearFicha(cx, cy - 185, colorProhibido);
    }
    else if (nivel === 8) {
        maxScroll = -400;
        const p1 = crearPlataforma(cx, cy, 600); colgarPlataforma(p1, cx, 600);
        crearPilar(cx - 150, cy - 70); crearPilar(cx + 150, cy - 70);
        const p2 = crearPlataforma(cx, cy - 140, 400);
        
        for(let i=0; i<5; i++) { crearFicha(cx - 160 + (i*80), cy - 185, colorEnemigoSeguro(), true); }
        crearFicha(cx, cy - 265, colorProhibido);
        crearFicha(cx - 150, cy - 225, colorEnemigoSeguro()); crearFicha(cx + 150, cy - 225, colorEnemigoSeguro());
    }
    else if (nivel === 9) {
        maxScroll = -600;
        const p1 = crearPlataforma(cx, cy, 800); colgarPlataforma(p1, cx, 800);
        
        crearPilar(cx - 200, cy - 70); const p2a = crearPlataforma(cx - 200, cy - 140, 300);
        crearPilar(cx - 200, cy - 210); const p3a = crearPlataforma(cx - 200, cy - 280, 200);
        crearPilar(cx + 200, cy - 70); const p2b = crearPlataforma(cx + 200, cy - 140, 300);
        crearPilar(cx + 200, cy - 210); const p3b = crearPlataforma(cx + 200, cy - 280, 200);
        
        // Asignación de fichas superior en torres gemelas con aleatoriedad
        let posiciones = [cx - 200, cx + 200].sort(() => Math.random() - 0.5);
        crearFicha(posiciones[0], cy - 325, colorProhibido);
        crearFicha(posiciones[1], cy - 325, colorEnemigoSeguro());
        
        crearFicha(cx - 250, cy - 185, colorEnemigoSeguro()); crearFicha(cx - 150, cy - 185, colorEnemigoSeguro());
        crearFicha(cx + 250, cy - 185, colorEnemigoSeguro()); crearFicha(cx + 150, cy - 185, colorEnemigoSeguro());
    }
    else if (nivel === 10) {
        maxScroll = -800;
        const p1 = crearPlataforma(cx, cy, 700); colgarPlataforma(p1, cx, 700);
        crearPilar(cx - 150, cy - 70); crearPilar(cx + 150, cy - 70);
        const p2 = crearPlataforma(cx, cy - 140, 600);
        
        crearFicha(cx - 250, cy - 185, colorEnemigoSeguro()); crearFicha(cx + 250, cy - 185, colorEnemigoSeguro());
        crearFicha(cx - 50, cy - 185, colorEnemigoSeguro()); crearFicha(cx + 50, cy - 185, colorEnemigoSeguro());

        crearPilar(cx - 80, cy - 210); crearPilar(cx + 80, cy - 210);
        const p3 = crearPlataforma(cx, cy - 280, 300);
        for(let i=0; i<3; i++) { crearFicha(cx - 80 + (i*80), cy - 325, colorEnemigoSeguro(), false); }

        crearPilar(cx, cy - 350);
        const p4 = crearPlataforma(cx, cy - 420, 150);
        crearFicha(cx, cy - 465, colorEnemigoSeguro(), true);
        
        const pendFinal = crearPlataforma(cx, cy - 520, 100); colgarPlataforma(pendFinal, cx, 100, cy - 420);
        crearFicha(cx, cy - 520 - 65, colorProhibido, true); 
    }
}

// --- CÁMARA Y UPDATE PRINCIPAL ---
window.addEventListener('wheel', (e) => {
    if (!juegoActivo || juegoPausado) return;
    cameraY += e.deltaY * 0.8;
    if (cameraY > 0) cameraY = 0; if (cameraY < maxScroll) cameraY = maxScroll; 
    actualizarCamara();
});
function actualizarCamara() { Render.lookAt(render, { min: { x: 0, y: cameraY }, max: { x: window.innerWidth, y: window.innerHeight + cameraY }}); }

Events.on(engine, 'beforeUpdate', () => {
    if (!juegoActivo || juegoPausado) return;

    if (Date.now() < ghostUntil) {
        if (!cursorFisico.isSensor) {
            cursorFisico.isSensor = true;
            cursorFisico.render.opacity = 0.4;
        }
    } else {
        if (cursorFisico.isSensor) {
            cursorFisico.isSensor = false;
            cursorFisico.render.opacity = 1;
        }
    }

    let posX = ratonX; 
    let posY = ratonY + cameraY; 
    
    if (estadoRuleta === 'INVERTIDO') { 
        posX = window.innerWidth - ratonX; 
        posY = (window.innerHeight - ratonY) + cameraY; 
    }
    
    Body.setPosition(cursorFisico, { 
        x: cursorFisico.position.x + (posX - cursorFisico.position.x) * 0.2, 
        y: cursorFisico.position.y + (posY - cursorFisico.position.y) * 0.2 
    });
});

// --- PUNTOS Y VICTORIA ---
const scoreDisplay = document.getElementById('score-counter');

Events.on(engine, 'afterUpdate', () => {
    if (!juegoActivo || juegoPausado) return;
    
    let enemigasVivas = 0;
    let perdiste = false;
    const abismoY = window.innerHeight + cameraY + 600;

    for (let i = todasLasFichas.length - 1; i >= 0; i--) {
        let f = todasLasFichas[i];
        let fueraDeLimites = f.position.y > abismoY || f.position.x < -600 || f.position.x > window.innerWidth + 600;

        if (fueraDeLimites) {
            if (!f.caida) {
                f.caida = true; 
                if (f.colorAsignado === colorProhibido) { perdiste = true; } 
                else {
                    puntos += (f.vertices.length === 3 ? 2 : 1); 
                    scoreDisplay.innerText = `PUNTOS: ${puntos}`;
                }
            }
            World.remove(world, f); todasLasFichas.splice(i, 1);
        } else {
            if (f.colorAsignado !== colorProhibido && !f.caida) enemigasVivas++;
        }
    }

    for (let j = todaLaEstructura.length - 1; j >= 0; j--) {
        let est = todaLaEstructura[j];
        if (est.position.y > abismoY || est.position.x < -600 || est.position.x > window.innerWidth + 600) {
            if (!est.caida) { est.caida = true; puntos -= 3; scoreDisplay.innerText = `PUNTOS: ${puntos}`; }
            World.remove(world, est); todaLaEstructura.splice(j, 1);
        }
    }

    if (perdiste) { terminarJuego(false); return; }
    if (enemigasVivas === 0 && todasLasFichas.length > 0 && juegoActivo) {
        if (currentLevel === totalNiveles) { terminarJuego(true); } 
        else { winLevel(); }
    }
});

// --- MANUAL DE AYUDA Y PAUSA ---
const helpScreen = document.getElementById('help-screen');
const btnHelp = document.getElementById('btn-help');
const btnCloseHelp = document.getElementById('btn-close-help');

function toggleHelp() {
    if(!helpScreen) return;
    const isClosed = helpScreen.style.display === 'none';
    
    if(isClosed) {
        juegoPausado = true;
        engine.timing.timeScale = 0; 
        helpScreen.style.display = 'flex';
        setTimeout(() => helpScreen.style.opacity = 1, 50);
        document.body.style.cursor = 'default'; 
    } else {
        helpScreen.style.opacity = 0;
        setTimeout(() => {
            helpScreen.style.display = 'none';
            juegoPausado = false;
            engine.timing.timeScale = 1; 
            ratonX = globalMouseX; ratonY = globalMouseY; 
            document.body.style.cursor = 'none';
            ghostUntil = Date.now() + 1000;
        }, 500);
    }
}
if(btnHelp) btnHelp.addEventListener('click', toggleHelp);
if(btnCloseHelp) btnCloseHelp.addEventListener('click', toggleHelp);

window.addEventListener('keydown', (e) => { 
    if (e.key.toLowerCase() === 'h') {
        if (document.activeElement.tagName === 'INPUT' || !juegoActivo) return;
        toggleHelp(); 
    }
});

// --- PANTALLAS DE JUEGO ---
const introScreen = document.getElementById('intro-screen');
const ruletaBox = document.getElementById('ruleta-color-box');
const ruletaName = document.getElementById('ruleta-color-name');
const btnStart = document.getElementById('btn-start');

let spinInterval = setInterval(() => {
    let rc = coloresArr[Math.floor(Math.random() * coloresArr.length)];
    ruletaBox.style.backgroundColor = palette[rc]; 
    ruletaName.innerText = rc; 
    ruletaName.style.color = cNegro; 
}, 100);

setTimeout(() => {
    clearInterval(spinInterval);
    colorProhibido = coloresArr[Math.floor(Math.random() * coloresArr.length)];
    ruletaBox.style.backgroundColor = palette[colorProhibido];
    ruletaName.innerText = `TU COLOR: ${colorProhibido}`; 
    ruletaName.style.color = cNegro; 
    
    const instruccionJuego = document.getElementById('instruccion-juego');
    instruccionJuego.innerText = `No dejes caer tu color prohibido: ${colorProhibido}`;
    if (colorProhibido === 'BLANCO') {instruccionJuego.style.color = cNegro;} 
    else {instruccionJuego.style.color = palette[colorProhibido];}
    
    btnStart.style.opacity = 1; btnStart.style.pointerEvents = 'auto';
}, 3000);

btnStart.addEventListener('click', () => {
    introScreen.style.opacity = 0;
    setTimeout(() => { introScreen.style.display = 'none'; }, 500);
    juegoActivo = true; cargarNivel(currentLevel);
});

function winLevel() {
    juegoActivo = false;
    const winScreen = document.getElementById('level-win-screen');
    winScreen.style.display = 'flex'; setTimeout(() => winScreen.style.opacity = 1, 50);
}

const btnNextLevel = document.getElementById('btn-next-level');
btnNextLevel.addEventListener('click', () => {
    btnNextLevel.style.pointerEvents = 'none'; 
    const winScreen = document.getElementById('level-win-screen'); winScreen.style.opacity = 0;
    setTimeout(() => {
        winScreen.style.display = 'none'; btnNextLevel.style.pointerEvents = 'auto'; 
        currentLevel++; cargarNivel(currentLevel); juegoActivo = true;
    }, 500);
});

// --- LEADERBOARD LOCALSTORAGE ---
function terminarJuego(victoria) {
    juegoActivo = false;
    const goScreen = document.getElementById('game-over-screen');
    const endTitle = document.getElementById('end-title');
    const endText = document.getElementById('game-over-text');
    document.getElementById('final-score-display').innerText = puntos;
    document.body.style.cursor = 'default';

    if (victoria) {
        endTitle.innerText = "¡PROYECTO COMPLETADO!";
        endTitle.style.color = palette['CIAN'];
        endText.innerText = `Limpiaste la estructura final en el Nivel ${totalNiveles} sin perder tu color.`;
    } else {
        endTitle.innerText = "FIN DEL JUEGO";
        endTitle.style.color = palette['ROJO'];
        endText.innerText = "Dejaste caer tu color prohibido al vacío.";
    }

    goScreen.style.display = 'flex';
    setTimeout(() => goScreen.style.opacity = 1, 50);
}

document.getElementById('btn-save-score').addEventListener('click', () => {
    const inputNombre = document.getElementById('player-name').value.trim() || 'Anónimo';
    
    let scores = JSON.parse(localStorage.getItem('gravitudScores')) || [];
    scores.push({ nombre: inputNombre, puntos: puntos });
    scores.sort((a, b) => b.puntos - a.puntos);
    scores = scores.slice(0, 5); 
    localStorage.setItem('gravitudScores', JSON.stringify(scores));

    document.getElementById('game-over-screen').style.opacity = 0;
    setTimeout(() => {
        document.getElementById('game-over-screen').style.display = 'none';
        mostrarLeaderboard(scores);
    }, 500);
});

function mostrarLeaderboard(scores) {
    const leaderboardScreen = document.getElementById('leaderboard-screen');
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    scores.forEach((s, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>#${index + 1} ${s.nombre}</span> <span>${s.puntos} pts</span>`;
        list.appendChild(li);
    });

    leaderboardScreen.style.display = 'flex';
    setTimeout(() => leaderboardScreen.style.opacity = 1, 50);
}

// --- LA RULETA DEL CAOS ---
const uiStatus = document.getElementById('ruleta-status');
const canvasContainer = document.getElementById('canvas-container');

setInterval(() => {
    if(!juegoActivo || juegoPausado) return;
    
    resetCursorScale();
    ghostUntil = Date.now() + 1200;

    const modos = ['NORMAL', 'INVERTIDO', 'GIGANTE', 'VISTA CENITAL'];
    estadoRuleta = modos[Math.floor(Math.random() * modos.length)];
    
    uiStatus.classList.add('alerta');
    canvasContainer.classList.remove('vista-cenital'); 

    if (estadoRuleta === 'NORMAL') { 
        uiStatus.innerText = 'ESTABILIDAD NORMAL'; 
        cursorFisico.render.fillStyle = cNegro; 
        Body.setPosition(cursorFisico, { x: ratonX, y: ratonY + cameraY });
    } 
    else if (estadoRuleta === 'INVERTIDO') { 
        uiStatus.innerText = '¡MANO TORPE! (Cursor Invertido)'; 
        cursorFisico.render.fillStyle = cRojo; 
        Body.setPosition(cursorFisico, { x: window.innerWidth - ratonX, y: (window.innerHeight - ratonY) + cameraY });
    } 
    else if (estadoRuleta === 'GIGANTE') { 
        uiStatus.innerText = '¡CAÑA PESADA! (Cursor Gigante)'; 
        escalaActual = 3; 
        Body.scale(cursorFisico, escalaActual, escalaActual); 
        Body.setPosition(cursorFisico, { x: ratonX, y: ratonY + cameraY });
        cursorFisico.render.fillStyle = cCian; 
    }
    else if (estadoRuleta === 'VISTA CENITAL') { 
        uiStatus.innerText = '¡VISTA CENITAL! (Perspectiva Isométrica)'; 
        canvasContainer.classList.add('vista-cenital'); 
        cursorFisico.render.fillStyle = cNegro; 
        Body.setPosition(cursorFisico, { x: ratonX, y: ratonY + cameraY });
    }

    setTimeout(() => uiStatus.classList.remove('alerta'), 1000);

}, 8000); 

window.addEventListener('keydown', (e) => {
    if(e.key.toLowerCase() === 'n' && juegoActivo && !juegoPausado) {
        currentLevel++; cargarNivel(currentLevel);
    }
});

Render.run(render); const runner = Runner.create(); Runner.run(runner, engine);
window.addEventListener('resize', () => { render.canvas.width = window.innerWidth; render.canvas.height = window.innerHeight; actualizarCamara(); });