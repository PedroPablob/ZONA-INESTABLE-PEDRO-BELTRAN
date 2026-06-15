const { Engine, Render, Runner, World, Bodies, Body, Events, Constraint, Composite } = Matter;

// CONFIGURACIÓN MÁXIMA ESTABILIDAD: Sin modo 'sleeping' para evitar transparencias y bloqueos
const engine = Engine.create({
    positionIterations: 20, // Precisión matemática ultra alta para evitar temblores
    velocityIterations: 15
});
const world = engine.world;

const render = Render.create({
    element: document.getElementById('canvas-container'),
    engine: engine,
    options: { 
        width: window.innerWidth, 
        height: window.innerHeight, 
        wireframes: false, // Colores sólidos activos
        background: 'transparent' 
    }
});

// Paletas de Color Oficiales
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
let totalNiveles = 5; 
let puntos = 0; 
let ratonX = window.innerWidth / 2;
let ratonY = 50; 
let cameraY = 0; 
let maxScroll = 0; 

let estadoRuleta = 'NORMAL';
let escalaActual = 1;
let juegoActivo = false;

let todasLasFichas = []; 
let todaLaEstructura = []; 

// --- GENERADOR DINÁMICO DE PATRÓN DE CUADROS ---
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

// --- CONSTRUCTOR DE NIVELES (REINICIO LIMPIO) ---
function limpiarMundo() {
    Composite.allBodies(world).forEach(body => { 
        if (body !== cursorFisico) World.remove(world, body); 
    });
    Composite.allConstraints(world).forEach(c => World.remove(world, c));
    todasLasFichas = [];
    todaLaEstructura = [];
    cameraY = 0;
    actualizarCamara();
    
    // El modo fantasma inicial ahora dura solo 1 segundo para agilizar la interacción
    cursorFisico.isSensor = true; 
    cursorFisico.render.opacity = 0.5; 

    Body.scale(cursorFisico, 1 / escalaActual, 1 / escalaActual);
    escalaActual = 1;
    estadoRuleta = 'NORMAL';
    document.getElementById('ruleta-status').innerText = 'ESTABILIDAD NORMAL';
    document.getElementById('ruleta-status').classList.remove('alerta');
    cursorFisico.render.fillStyle = cNegro;
    document.getElementById('canvas-container').classList.remove('vista-cenital'); 
    
    ratonX = window.innerWidth / 2;
    ratonY = 50;
    Body.setPosition(cursorFisico, { x: ratonX, y: ratonY });

    // Se solidifica de forma segura asegurando opacidad total
    setTimeout(() => {
        cursorFisico.isSensor = false;
        cursorFisico.render.opacity = 1;
    }, 1000);
}

function crearPlataforma(x, y, w) {
    const h = 40; 
    const plat = Bodies.rectangle(x, y, w, h, { 
        render: { sprite: { texture: crearTexturaPlataforma(w, h), xScale: 1, yScale: 1 } },
        friction: 1, 
        frictionStatic: 20, 
        density: 0.2, // Mayor peso base para estabilizar pisos superiores
        restitution: 0 
    });
    plat.isEstructura = true; plat.caida = false;
    World.add(world, plat); 
    todaLaEstructura.push(plat); 
    return plat;
}

function colgarPlataforma(plat, x, ancho) {
    World.add(world, Constraint.create({ pointA: { x: x - (ancho/2 - 20), y: -1000 }, bodyB: plat, pointB: { x: -(ancho/2 - 20), y: 0 }, stiffness: 0.1, render: { strokeStyle: cNegro } }));
    World.add(world, Constraint.create({ pointA: { x: x + (ancho/2 - 20), y: -1000 }, bodyB: plat, pointB: { x: (ancho/2 - 20), y: 0 }, stiffness: 0.1, render: { strokeStyle: cNegro } }));
}

function crearPilar(x, y) {
    const pilar = Bodies.rectangle(x, y, 40, 100, { 
        render: { fillStyle: cMadera }, 
        friction: 1, 
        frictionStatic: 20, 
        density: 0.1, 
        restitution: 0,
        slop: 0.02 // Tolerancia de error para encaje perfecto sin micro-rebotes
    });
    pilar.isEstructura = true; pilar.caida = false;
    World.add(world, pilar); 
    todaLaEstructura.push(pilar);
}

function crearFicha(x, y, colorName) {
    const isTri = Math.random() > 0.5;
    const opcionesFicha = { 
        render: { fillStyle: palette[colorName] }, 
        friction: 0.9, 
        density: 0.002, // Extremadamente ligeras para que no colapsen los pilares
        restitution: 0 
    };
    const ficha = isTri ? Bodies.polygon(x, y, 3, 35, opcionesFicha) : Bodies.rectangle(x, y, 40, 80, opcionesFicha);
    
    ficha.colorAsignado = colorName; ficha.caida = false; 
    World.add(world, ficha); 
    todasLasFichas.push(ficha);
}

function colorEnemigoSeguro() {
    let rc; 
    do { rc = coloresArr[Math.floor(Math.random() * coloresArr.length)]; } 
    while (rc === colorProhibido); 
    return rc;
}

function cargarNivel(nivel) {
    limpiarMundo();
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight - 100;
    document.getElementById('level-indicator').innerText = `NIVEL ${nivel}`;

    if (nivel === 1) {
        maxScroll = 0; 
        const p1 = crearPlataforma(cx, cy, 600); colgarPlataforma(p1, cx, 600);
        crearPilar(cx, cy - 70);
        crearFicha(cx - 200, cy - 65, colorEnemigoSeguro()); crearFicha(cx - 100, cy - 65, colorEnemigoSeguro());
        crearFicha(cx + 200, cy - 65, colorEnemigoSeguro()); crearFicha(cx + 100, cy - 65, colorEnemigoSeguro());
        crearFicha(cx - 50, cy - 65, colorProhibido); 
    } 
    else if (nivel === 2) {
        maxScroll = -200; 
        const p1 = crearPlataforma(cx, cy, 600); colgarPlataforma(p1, cx, 600);
        crearPilar(cx - 150, cy - 70); crearPilar(cx + 150, cy - 70);
        const p2 = crearPlataforma(cx, cy - 140, 400); 
        crearFicha(cx - 100, cy - 185, colorEnemigoSeguro()); crearFicha(cx + 100, cy - 185, colorEnemigoSeguro()); crearFicha(cx, cy - 185, colorProhibido);
    }
    else if (nivel === 3) {
        maxScroll = -300; 
        const p1 = crearPlataforma(cx, cy, 600); colgarPlataforma(p1, cx, 600);
        crearPilar(cx - 150, cy - 70); crearPilar(cx + 150, cy - 70);
        const p2 = crearPlataforma(cx, cy - 140, 400); 
        crearPilar(cx - 80, cy - 210); crearPilar(cx + 80, cy - 210);
        const p3 = crearPlataforma(cx, cy - 280, 240); 
        crearFicha(cx - 50, cy - 325, colorEnemigoSeguro()); crearFicha(cx + 50, cy - 325, colorProhibido);
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
    else if (nivel >= 5) {
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
        crearFicha(cx - 150, cy - 325, colorEnemigoSeguro()); crearFicha(cx + 150, cy - 325, colorEnemigoSeguro());
        crearFicha(cx, cy - 325, colorProhibido);
    }
}

// --- LÓGICA DE CÁMARA Y MOUSE ---
window.addEventListener('wheel', (e) => {
    if (!juegoActivo) return;
    cameraY += e.deltaY * 0.8;
    if (cameraY > 0) cameraY = 0; if (cameraY < maxScroll) cameraY = maxScroll; 
    actualizarCamara();
});
function actualizarCamara() { Render.lookAt(render, { min: { x: 0, y: cameraY }, max: { x: window.innerWidth, y: window.innerHeight + cameraY }}); }
window.addEventListener('mousemove', (e) => { ratonX = e.clientX; ratonY = e.clientY; });

Events.on(engine, 'beforeUpdate', () => {
    if (!juegoActivo) return;
    let posX = ratonX; let posY = ratonY + cameraY; 
    if (estadoRuleta === 'INVERTIDO') { posX = window.innerWidth - ratonX; posY = (window.innerHeight - ratonY) + cameraY; }
    Body.setPosition(cursorFisico, { x: cursorFisico.position.x + (posX - cursorFisico.position.x) * 0.2, y: cursorFisico.position.y + (posY - cursorFisico.position.y) * 0.2 });
});

// --- LÓGICA DE JUEGO, PUNTOS Y ABISMO REAL ---
const scoreDisplay = document.getElementById('score-counter');

Events.on(engine, 'afterUpdate', () => {
    if (!juegoActivo) return;
    
    let enemigasVivas = 0;
    let perdiste = false;
    // Abismo absoluto desvinculado de la cámara para evitar activaciones falsas
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
    document.getElementById('instruccion-juego').innerText = `No dejes caer tu color prohibido: ${colorProhibido}`;
    document.getElementById('instruccion-juego').style.color = palette[colorProhibido];
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

    if (victoria) {
        endTitle.innerText = "¡PROYECTO COMPLETADO!";
        endTitle.style.color = palette['CIAN'];
        endText.innerText = "Limpiaste la estructura final en el Nivel 5 sin perder tu color.";
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
    if(!juegoActivo) return;
    const modos = ['NORMAL', 'INVERTIDO', 'GIGANTE', 'VISTA CENITAL'];
    estadoRuleta = modos[Math.floor(Math.random() * modos.length)];
    
    uiStatus.classList.add('alerta');
    if (!cursorFisico.isSensor) { Body.scale(cursorFisico, 1 / escalaActual, 1 / escalaActual); escalaActual = 1; }
    canvasContainer.classList.remove('vista-cenital'); 

    if (estadoRuleta === 'NORMAL') { uiStatus.innerText = 'ESTABILIDAD NORMAL'; if (!cursorFisico.isSensor) cursorFisico.render.fillStyle = cNegro; } 
    else if (estadoRuleta === 'INVERTIDO') { uiStatus.innerText = '¡MANO TORPE! (Cursor Invertido)'; if (!cursorFisico.isSensor) cursorFisico.render.fillStyle = cRojo; } 
    else if (estadoRuleta === 'GIGANTE') { uiStatus.innerText = '¡CAÑA PESADA! (Cursor Giant)'; if (!cursorFisico.isSensor) { escalaActual = 3; Body.scale(cursorFisico, escalaActual, escalaActual); cursorFisico.render.fillStyle = cCian; } }
    else if (estadoRuleta === 'VISTA CENITAL') { uiStatus.innerText = '¡VISTA CENITAL! (Perspectiva Isométrica)'; canvasContainer.classList.add('vista-cenital'); if (!cursorFisico.isSensor) cursorFisico.render.fillStyle = cNegro; }

    setTimeout(() => uiStatus.classList.remove('alerta'), 1000);
}, 8000); 

// Atajo Tecla N
window.addEventListener('keydown', (e) => {
    if(e.key.toLowerCase() === 'n' && juegoActivo) {
        currentLevel++; cargarNivel(currentLevel);
    }
});

Render.run(render); const runner = Runner.create(); Runner.run(runner, engine);
window.addEventListener('resize', () => { render.canvas.width = window.innerWidth; render.canvas.height = window.innerHeight; actualizarCamara(); });