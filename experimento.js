const { Engine, World, Bodies, Body, Events, Composite } = Matter;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;

const engine = Engine.create();
engine.gravity.y = 0; engine.gravity.x = 0;
const world = engine.world;

const palette = {
    'Cian': '#7ab1b8', 'Rojo': '#8b1c2b', 'Blanco': '#e0e5eb', 'Rosa': '#cca8b0', 'Negro': '#050505',
    'Vidrio': 'rgba(166, 221, 229, 0.4)'
};
const coloresArr = Object.keys(palette).filter(c => c !== 'Negro' && c !== 'Vidrio');

const tileSize = 120; 
const mapWidth = 4800;  
const mapHeight = 3000; 

let puntos = 0;
let metaPuntos = Math.floor(Math.random() * 14) + 2; 
let colorObjetivo = '';

let juegoActivo = false;
let estaDescendiendo = false;
let factorDescentAnim = 0; 
let pozoObjetivo = null;

let isSpawning = false;
let spawnZ = 0;
let spawnVZ = 0;

let activeEffect = null; 
let effectEndTime = 0;
let isTransitioning = false;
let transitionEndTime = 0;
let currentPlayerRadius = 35;

let pozos = [];
let fragmentosActivos = [];
let pilaresCayendo = []; 

let player = Bodies.circle(mapWidth / 2, mapHeight / 2, currentPlayerRadius, {
    frictionAir: 0.05, restitution: 0.5, density: 0.05 
});
player.isPlayer = true; 
World.add(world, player);

// --- 1. SOMBRAS RADIALES ---
function calcularSombraUnica(vertices, zHeight, lightPos) {
    let cx = 0, cy = 0;
    vertices.forEach(v => { cx += v.x; cy += v.y; });
    cx /= vertices.length; cy /= vertices.length;

    let dx = cx - lightPos.x; let dy = cy - lightPos.y;
    let dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1); 

    let shadowIntensity = Math.max(0, 1 - (dist / 1500)); 
    let shadowLength = zHeight * (800 / Math.max(dist, 30));
    shadowLength = Math.min(shadowLength, 2000); 

    let sx = (dx / dist) * shadowLength;
    let sy = (dy / dist) * shadowLength;
    
    return { intensity: shadowIntensity, sx, sy };
}

// --- 2. RENDERIZADOR CUERPOS 3D ---
function dibujarCuerpo3D(ctx, vertices, colorHex, zHeight, lightPos, isGlass = false, glassState = 'normal', impactPoint = null, glassPositions = null, isModifier = false) {
    const vx = zHeight * 0.35;
    const vy = -zHeight * 0.85;

    let v0 = vertices[0], v1 = vertices[1], v2 = vertices[2], v3 = vertices[3];
    let cx = (v0.x + v2.x)/2; let cy = (v0.y + v2.y)/2;
    
    let top0 = {x: v0.x + vx, y: v0.y + vy}; let top1 = {x: v1.x + vx, y: v1.y + vy};
    let top2 = {x: v2.x + vx, y: v2.y + vy}; let top3 = {x: v3.x + vx, y: v3.y + vy};

    let dx = cx - lightPos.x; let dy = cy - lightPos.y;
    let dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1); 
    let dirX = dx / dist; let dirY = dy / dist;

    if (isGlass) { ctx.save(); ctx.globalAlpha = 0.45; }

    const r = parseInt(colorHex.slice(1,3), 16); const g = parseInt(colorHex.slice(3,5), 16); const b = parseInt(colorHex.slice(5,7), 16);
    
    let topLight = Math.max(0, 1 - (dist/600));
    const topColor = isGlass ? 'rgba(200, 240, 255, 0.7)' : `rgb(${Math.min(255, r+30 + (60*topLight))}, ${Math.min(255, g+30 + (60*topLight))}, ${Math.min(255, b+30 + (60*topLight))})`;

    let leftLight = Math.max(0, dirX) * 100 * Math.max(0, 1 - dist/800);
    let frontLight = Math.max(0, -dirY) * 100 * Math.max(0, 1 - dist/800);

    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; 

    let hasLeftNeighbor = isGlass && glassPositions && glassPositions.has(`${Math.round(cx - tileSize)},${Math.round(cy)}`);
    if (!hasLeftNeighbor) {
        ctx.beginPath(); ctx.moveTo(v0.x, v0.y); ctx.lineTo(v3.x, v3.y); ctx.lineTo(top3.x, top3.y); ctx.lineTo(top0.x, top0.y); ctx.closePath();
        ctx.fillStyle = isGlass ? 'rgba(140, 200, 220, 0.4)' : `rgb(${Math.max(0, Math.min(255, r - 70 + leftLight))}, ${Math.max(0, Math.min(255, g - 70 + leftLight))}, ${Math.max(0, Math.min(255, b - 70 + leftLight))})`;
        ctx.fill(); if (!isGlass) ctx.stroke();
    }

    let hasFrontNeighbor = isGlass && glassPositions && glassPositions.has(`${Math.round(cx)},${Math.round(cy + tileSize)}`);
    if (!hasFrontNeighbor) {
        ctx.beginPath(); ctx.moveTo(v3.x, v3.y); ctx.lineTo(v2.x, v2.y); ctx.lineTo(top2.x, top2.y); ctx.lineTo(top3.x, top3.y); ctx.closePath();
        ctx.fillStyle = isGlass ? 'rgba(140, 200, 220, 0.4)' : `rgb(${Math.max(0, Math.min(255, r - 40 + frontLight))}, ${Math.max(0, Math.min(255, g - 40 + frontLight))}, ${Math.max(0, Math.min(255, b - 40 + frontLight))})`;
        ctx.fill(); if (!isGlass) ctx.stroke();
    }

    ctx.beginPath(); ctx.moveTo(top0.x, top0.y); ctx.lineTo(top1.x, top1.y); ctx.lineTo(top2.x, top2.y); ctx.lineTo(top3.x, top3.y); ctx.closePath();
    ctx.fillStyle = isModifier ? `rgb(${Math.max(0,r-60)},${Math.max(0,g-60)},${Math.max(0,b-60)})` : topColor; 
    ctx.fill(); if (!isGlass && !isModifier) ctx.stroke();

    if (isModifier) {
        let peak = { x: cx + (zHeight + 50) * 0.35, y: cy - (zHeight + 50) * 0.85 };
        
        ctx.beginPath(); ctx.moveTo(top0.x, top0.y); ctx.lineTo(top3.x, top3.y); ctx.lineTo(peak.x, peak.y); ctx.closePath();
        ctx.fillStyle = `rgb(${Math.max(0, r-50)}, ${Math.max(0, g-50)}, ${Math.max(0, b-50)})`;
        ctx.fill(); ctx.stroke();
        
        ctx.beginPath(); ctx.moveTo(top3.x, top3.y); ctx.lineTo(top2.x, top2.y); ctx.lineTo(peak.x, peak.y); ctx.closePath();
        ctx.fillStyle = `rgb(${Math.max(0, r-20)}, ${Math.max(0, g-20)}, ${Math.max(0, b-20)})`;
        ctx.fill(); ctx.stroke();
    }

    if (isGlass && glassState === 'cracked' && impactPoint) {
        let impactTop = { x: cx + impactPoint.x + vx, y: cy + impactPoint.y + vy };
        
        if (!hasLeftNeighbor) {
            ctx.save(); ctx.beginPath(); ctx.moveTo(v0.x, v0.y); ctx.lineTo(v3.x, v3.y); ctx.lineTo(top3.x, top3.y); ctx.lineTo(top0.x, top0.y); ctx.closePath(); ctx.clip();
            dibujarGrietasParedLateral(ctx, [v0, v3, top3, top0], impactTop.x, impactTop.y); ctx.restore();
        }
        if (!hasFrontNeighbor) {
            ctx.save(); ctx.beginPath(); ctx.moveTo(v3.x, v3.y); ctx.lineTo(v2.x, v2.y); ctx.lineTo(top2.x, top2.y); ctx.lineTo(top3.x, top3.y); ctx.closePath(); ctx.clip();
            dibujarGrietasParedLateral(ctx, [v3, v2, top2, top3], impactTop.x, impactTop.y); ctx.restore();
        }
        
        ctx.save(); ctx.beginPath(); ctx.moveTo(top0.x, top0.y); ctx.lineTo(top1.x, top1.y); ctx.lineTo(top2.x, top2.y); ctx.lineTo(top3.x, top3.y); ctx.closePath(); ctx.clip();
        dibujarGrietasRealistas(ctx, {x: cx+vx, y: cy+vy}, impactPoint); ctx.restore();
    }
    if (isGlass) ctx.restore();
}

// --- 3. FRACTURAS REALISTAS ---
function dibujarGrietasRealistas(ctx, tcPos, impactPointLocal) {
    ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 1.0;
    let ix = tcPos.x + impactPointLocal.x; let iy = tcPos.y + impactPointLocal.y;
    let numRadiales = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < numRadiales; i++) {
        let angle = (Math.PI * 2 / numRadiales) * i + (tcPos.x * 0.05); 
        trazarLineaIrregular(ctx, ix, iy, ix + Math.cos(angle) * 150, iy + Math.sin(angle) * 150, 12, 8); 
    }
    let numConcéntricas = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numConcéntricas; i++) trazarPoligonoIrregular(ctx, ix, iy, 20 + i * 25, 8 + (20+i*25)/10, 10); 
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 15; i++) {
        let angle = (Math.PI * 2 / 15) * i; let len = 3 + Math.random() * 8;
        trazarLineaIrregular(ctx, ix, iy, ix + Math.cos(angle) * len, iy + Math.sin(angle) * len, 3, 2);
    }
    ctx.restore();
}

function dibujarGrietasParedLateral(ctx, quad, topIx, topIy) {
    ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
        let startX = TrazaLineaInterpolada(quad[3].x, quad[2].x, Math.random());
        let startY = TrazaLineaInterpolada(quad[3].y, quad[2].y, Math.random());
        let targetX = TrazaLineaInterpolada(quad[0].x, quad[1].x, Math.random());
        let targetY = TrazaLineaInterpolada(quad[0].y, quad[1].y, 1.0); 
        trazarLineaIrregular(ctx, startX, startY, targetX, targetY, 6, 12); 
    }
    ctx.restore();
}

function TrazaLineaInterpolada(a, b, p) { return a + (b - a) * p; }
function trazarLineaIrregular(ctx, x1, y1, x2, y2, segments, variance) {
    ctx.beginPath(); ctx.moveTo(x1, y1); let dx = x2 - x1; let dy = y2 - y1;
    for (let s = 1; s <= segments; s++) ctx.lineTo(x1 + dx * (s/segments) + (Math.random() * variance - variance / 2), y1 + dy * (s/segments) + (Math.random() * variance - variance / 2));
    ctx.stroke();
}
function trazarPoligonoIrregular(ctx, cx, cy, radio, segments, variance) {
    ctx.beginPath();
    for (let s = 0; s <= segments; s++) {
        let angle = (s / segments) * Math.PI * 2;
        let px = cx + Math.cos(angle) * radio + (Math.random() * variance - variance / 2);
        let py = cy + Math.sin(angle) * radio + (Math.random() * variance - variance / 2);
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
}

// --- 4. RENDER CUBOS CAYENDO ---
function dibujarCuboCayendo(ctx, p) {
    let easeProgress = p.progress * p.progress; 
    let theta = Math.min(easeProgress, 1) * (Math.PI / 2);
    let pivotX = p.fallDir.x * 35; let pivotY = p.fallDir.y * 35;
    
    let pts3D = [
        {x:-35, y:-35, z:0}, {x:35, y:-35, z:0}, {x:35, y:35, z:0}, {x:-35, y:35, z:0}, 
        {x:-35, y:-35, z:90}, {x:35, y:-35, z:90}, {x:35, y:35, z:90}, {x:-35, y:35, z:90} 
    ];
    if (p.isModifier) pts3D.push({x:0, y:0, z:140}); 

    let projPts = [];
    let rotX = -p.fallDir.y * theta; let rotY = p.fallDir.x * theta;
    
    for(let i=0; i<pts3D.length; i++) {
        let lx = pts3D[i].x - pivotX; let ly = pts3D[i].y - pivotY; let lz = pts3D[i].z;
        let nx, ny, nz;
        if (p.fallDir.y !== 0) {
            nx = lx; ny = ly * Math.cos(rotX) - lz * Math.sin(rotX); nz = ly * Math.sin(rotX) + lz * Math.cos(rotX);
        } else {
            nx = lx * Math.cos(rotY) + lz * Math.sin(rotY); ny = ly; nz = -lx * Math.sin(rotY) + lz * Math.cos(rotY);
        }
        nx += pivotX; ny += pivotY;
        projPts.push({ x: p.x + nx + nz * 0.35, y: p.y + ny - nz * 0.85 });
    }
    
    let faces = [
        { id: 'bottom', idx: [0, 1, 2, 3] }, { id: 'front', idx: [3, 2, 6, 7] }, { id: 'back', idx: [1, 0, 4, 5] },
        { id: 'right', idx: [2, 1, 5, 6] }, { id: 'left', idx: [0, 3, 7, 4] }
    ];
    if (p.isModifier) {
        faces.push({ id: 'pyr1', idx: [4, 8, 5] }); faces.push({ id: 'pyr2', idx: [5, 8, 6] });
        faces.push({ id: 'pyr3', idx: [6, 8, 7] }); faces.push({ id: 'pyr4', idx: [7, 8, 4] });
    } else {
        faces.push({ id: 'top', idx: [4, 7, 6, 5] });
    }
    
    const r = parseInt(p.colorHex.slice(1,3), 16); const g = parseInt(p.colorHex.slice(3,5), 16); const b = parseInt(p.colorHex.slice(5,7), 16);
    
    faces.forEach(face => {
        let p0 = projPts[face.idx[0]]; let p1 = projPts[face.idx[1]]; let p2 = projPts[face.idx[2]];
        let cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
        if (cross < 0) { 
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
            for(let k=1; k<face.idx.length; k++) ctx.lineTo(projPts[face.idx[k]].x, projPts[face.idx[k]].y);
            ctx.closePath();
            if (face.id === 'top' || face.id.startsWith('pyr')) ctx.fillStyle = `rgb(${r+30},${g+30},${b+30})`;
            else if (face.id === 'right' || face.id === 'left') ctx.fillStyle = `rgb(${r-50},${g-50},${b-50})`;
            else ctx.fillStyle = `rgb(${r-20},${g-20},${b-20})`;
            ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.stroke();
        }
    });
}

function detonarExplosionVidrio(spawnX, spawnY) {
    let numFrags = 16 + Math.floor(Math.random() * 8); 
    for (let i = 0; i < numFrags; i++) {
        let frag = Bodies.rectangle(
            spawnX + (Math.random() * 20 - 10), spawnY + (Math.random() * 20 - 10),
            10 + Math.random() * 12, 10 + Math.random() * 12, { frictionAir: 0.04, restitution: 0.4, density: 0.03 }
        );
        let angulo = (Math.PI * 2 / numFrags) * i; let empuje = 8 + Math.random() * 6;
        Body.setVelocity(frag, { x: Math.cos(angulo) * empuje, y: Math.sin(angulo) * empuje });
        frag.colorHex = '#c8f0ff'; frag.isFragment = true; frag.isGlassShard = true; frag.life = 150; 
        fragmentosActivos.push(frag); World.add(world, frag);
    }
}

// --- 5. LÓGICA DE MODIFICADORES ---
function limpiarEfectos() {
    if (activeEffect === 'negative') { Body.scale(player, 35/65, 35/65); currentPlayerRadius = 35; }
    activeEffect = null;
}

function activarEfecto(tipo) {
    if (activeEffect === 'negative' && tipo !== 'negative') { Body.scale(player, 35/65, 35/65); currentPlayerRadius = 35; }
    if (tipo === 'negative' && activeEffect !== 'negative') { Body.scale(player, 65/35, 65/35); currentPlayerRadius = 65; }
    activeEffect = tipo; effectEndTime = Date.now() + 15000; 
}

function dibujarGloboDialogo(ctx, x, y, texto) {
    ctx.save(); ctx.translate(x, y - 45); ctx.font = 'bold 14px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let rectW = ctx.measureText(texto).width + 32; let rectH = 30;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
    ctx.fillStyle = 'rgba(15, 18, 22, 0.9)'; ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-rectW/2, -rectH/2, rectW, rectH, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, rectH/2); ctx.lineTo(0, rectH/2 + 6); ctx.lineTo(6, rectH/2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowColor = 'transparent'; ctx.fillStyle = '#e0e5eb'; ctx.fillText(texto, 0, 1); ctx.restore();
}

function actualizarUI() {
    // FUNCIÓN LIMPIADA: Ya no busca elementos eliminados, evita que el juego se congele.
    document.getElementById('score-display').innerText = puntos;
    const targetEl = document.getElementById('target-display');
    targetEl.innerText = colorObjetivo; targetEl.style.color = palette[colorObjetivo] || '#FEFBF2';
    let targetBox = document.getElementById('target-box'); if (targetBox) targetBox.style.borderColor = palette[colorObjetivo] || '#222';
}

function girarRuleta() {
    juegoActivo = false; Body.setVelocity(player, { x: 0, y: 0 }); 
    const overlay = document.getElementById('roulette-screen');
    const rBox = document.getElementById('roulette-color'); const rName = document.getElementById('roulette-name');
    if(overlay) { overlay.style.display = 'flex'; setTimeout(() => overlay.style.opacity = '1', 50); }

    let giros = 0;
    let intervalo = setInterval(() => {
        let rc = coloresArr[Math.floor(Math.random() * coloresArr.length)];
        if(rBox) rBox.style.backgroundColor = palette[rc]; 
        if(rName) { rName.innerText = rc; rName.style.color = palette[rc]; }
        giros++;
        if (giros > 25) {
            clearInterval(intervalo); colorObjetivo = rc;
            if(rBox) rBox.style.backgroundColor = palette[colorObjetivo]; 
            if(rName) { rName.innerText = colorObjetivo; rName.style.color = palette[colorObjetivo]; }
            actualizarUI();
            setTimeout(() => { 
                if(overlay) overlay.style.opacity = '0'; 
                setTimeout(() => { 
                    if(overlay) overlay.style.display = 'none'; 
                    Body.setPosition(player, { x: mapWidth / 2, y: mapHeight / 2 });
                    isSpawning = true; spawnZ = 1200; spawnVZ = 0;
                }, 500); 
            }, 1500);
        }
    }, 80);
}

function generarMapa() {
    const cuerposFisicos = Composite.allBodies(world);
    cuerposFisicos.forEach(b => { if(!b.isPlayer) World.remove(world, b); });
    pozos = []; fragmentosActivos = []; pilaresCayendo = []; limpiarEfectos();

    const wt = 100; const wOpt = { isStatic: true };
    World.add(world, [
        Bodies.rectangle(mapWidth/2, -wt/2, mapWidth + wt*2, wt, wOpt), Bodies.rectangle(mapWidth/2, mapHeight + wt/2, mapWidth + wt*2, wt, wOpt),
        Bodies.rectangle(-wt/2, mapHeight/2, wt, mapHeight + wt*2, wOpt), Bodies.rectangle(mapWidth + wt/2, mapHeight/2, wt, mapHeight + wt*2, wOpt)
    ]);

    const maxCols = Math.floor(mapWidth / tileSize); const maxRows = Math.floor(mapHeight / tileSize);
    const casillasOcupadas = new Set();
    const cCol = Math.floor((mapWidth / 2) / tileSize); const cRow = Math.floor((mapHeight / 2) / tileSize);
    for (let c = cCol - 2; c <= cCol + 2; c++) for (let r = cRow - 2; r <= cRow + 2; r++) casillasOcupadas.add(`${c},${r}`);

    let pozosGen = 0;
    while(pozosGen < 15) {
        let col = Math.floor(Math.random() * (maxCols - 4)) + 2; let row = Math.floor(Math.random() * (maxRows - 4)) + 2;
        if (!casillasOcupadas.has(`${col},${row}`)) {
            casillasOcupadas.add(`${col},${row}`);
            pozos.push({ col, row, x: col * tileSize, y: row * tileSize, cx: col * tileSize + tileSize / 2, cy: row * tileSize + tileSize / 2 });
            pozosGen++;
        }
    }

    for (let w = 0; w < 12; w++) { 
        let startCol = Math.floor(Math.random() * (maxCols - 10)) + 5; let startRow = Math.floor(Math.random() * (maxRows - 10)) + 5;
        let esVertical = Math.random() > 0.5; let largoMuro = 4 + Math.floor(Math.random() * 5); 
        for (let i = 0; i < largoMuro; i++) {
            let col = esVertical ? startCol : startCol + i; let row = esVertical ? startRow + i : startRow;
            let key = `${col},${row}`;
            if (!casillasOcupadas.has(key) && col < maxCols - 2 && row < maxRows - 2) {
                casillasOcupadas.add(key);
                World.add(world, Bodies.rectangle(col * tileSize + tileSize / 2, row * tileSize + tileSize / 2, 120, 120, { isStatic: true, isGlass: true, glassState: 'normal' }));
            }
        }
    }

    let modifiersGen = 0;
    while(modifiersGen < 10) {
        let col = Math.floor(Math.random() * (maxCols - 4)) + 2; let row = Math.floor(Math.random() * (maxRows - 4)) + 2;
        if (!casillasOcupadas.has(`${col},${row}`)) {
            casillasOcupadas.add(`${col},${row}`);
            let colorRandom = coloresArr[Math.floor(Math.random() * coloresArr.length)];
            World.add(world, Bodies.rectangle(col * tileSize + tileSize / 2, row * tileSize + tileSize / 2, 70, 70, { isStatic: true, isModifier: true, colorKey: colorRandom }));
            modifiersGen++;
        }
    }

    let pilaresGen = 0;
    while(pilaresGen < 120) {
        let col = Math.floor(Math.random() * (maxCols - 4)) + 2; let row = Math.floor(Math.random() * (maxRows - 4)) + 2;
        if (!casillasOcupadas.has(`${col},${row}`)) {
            casillasOcupadas.add(`${col},${row}`);
            let colorRandom = coloresArr[Math.floor(Math.random() * coloresArr.length)];
            World.add(world, Bodies.rectangle(col * tileSize + tileSize / 2, row * tileSize + tileSize / 2, 70, 70, { isStatic: true, isPillar: true, colorKey: colorRandom }));
            pilaresGen++;
        }
    }
    
    puntos = 0; metaPuntos = Math.floor(Math.random() * 14) + 2; girarRuleta();
}

// --- 6. PROPAGACIÓN Y COLISIONES ---
function propagarImpactoVidrio(primerVidrio, speed, impactPointLocal, playerVelocity) {
    if (speed < 1.0) return; 
    let colBase = Math.floor(primerVidrio.position.x / tileSize); let rowBase = Math.floor(primerVidrio.position.y / tileSize);
    let dx = playerVelocity.x; let dy = playerVelocity.y;
    let stepCol = 0; let stepRow = 0;
    if (Math.abs(dx) > Math.abs(dy)) stepCol = dx > 0 ? 1 : -1; else stepRow = dy > 0 ? 1 : -1;

    let cadena = [primerVidrio]; let todosVidrios = Composite.allBodies(world).filter(b => b.isGlass);
    for (let i = 1; i <= 3; i++) {
        let nextVidrio = todosVidrios.find(v => Math.floor(v.position.x / tileSize) === colBase + (stepCol * i) && Math.floor(v.position.y / tileSize) === rowBase + (stepRow * i));
        if (nextVidrio) cadena.push(nextVidrio); else break; 
    }

    if (speed >= 2.5) { 
        cadena.forEach((v, index) => {
            if (index === 0 || index === 1) { World.remove(world, v); detonarExplosionVidrio(v.position.x, v.position.y); }
            else if (index === 2 || index === 3) {
                if (v.glassState === 'normal') { v.glassState = 'cracked'; v.impactPoint = { x: -stepCol * 20, y: -stepRow * 20 }; } 
                else if (v.glassState === 'cracked') { World.remove(world, v); detonarExplosionVidrio(v.position.x, v.position.y); }
            }
        });
    } else { 
        cadena.forEach((v, index) => {
            if (index === 0 || index === 1) {
                if (v.glassState === 'normal') { v.glassState = 'cracked'; v.impactPoint = index === 0 ? impactPointLocal : { x: -stepCol * 20, y: -stepRow * 20 }; } 
                else if (v.glassState === 'cracked' && speed >= 1.0) { World.remove(world, v); detonarExplosionVidrio(v.position.x, v.position.y); }
            }
        });
    }
}

function verificarImpactoFisico(event) {
    if (!juegoActivo || estaDescendiendo || isSpawning || isTransitioning) return;
    
    event.pairs.forEach(pair => {
        const pA = pair.bodyA.isPlayer; const pB = pair.bodyB.isPlayer;
        let obstaculo = null;
        if (pA) obstaculo = pair.bodyB; else if (pB) obstaculo = pair.bodyA;
        if (!obstaculo) return;

        if (obstaculo.isGlass) {
            let speed = Matter.Vector.magnitude(player.velocity);
            let impactPointLocal = { x: 0, y: 0 };
            if (pair.activeContacts && pair.activeContacts.length > 0) {
                let worldImpactPoint = pair.activeContacts[0].vertex;
                impactPointLocal = { x: worldImpactPoint.x - obstaculo.position.x, y: worldImpactPoint.y - obstaculo.position.y };
            } else {
                let relPos = Matter.Vector.sub(player.position, obstaculo.position);
                impactPointLocal = { x: relPos.x * 0.5, y: relPos.y * 0.5 };
            }
            propagarImpactoVidrio(obstaculo, speed, impactPointLocal, player.velocity);
        }
        else if (obstaculo.isPillar || obstaculo.isModifier) {
            World.remove(world, obstaculo);
            
            if (obstaculo.isModifier) {
                if (obstaculo.colorKey === colorObjetivo) activarEfecto('positive'); else activarEfecto('negative');
            } else {
                if (obstaculo.colorKey === colorObjetivo) puntos++; else puntos--; 
            }
            actualizarUI();

            let dx = obstaculo.position.x - player.position.x; let dy = obstaculo.position.y - player.position.y;
            let fallDir = { x: 0, y: 0 };
            if (Math.abs(dx) > Math.abs(dy)) fallDir.x = dx > 0 ? 1 : -1; else fallDir.y = dy > 0 ? 1 : -1;

            pilaresCayendo.push({
                x: obstaculo.position.x, y: obstaculo.position.y,
                vertices: obstaculo.vertices.map(v => ({x: v.x, y: v.y})),
                colorKey: obstaculo.colorKey, colorHex: palette[obstaculo.colorKey],
                fallDir: fallDir, progress: 0, exploded: false, isModifier: obstaculo.isModifier
            });
        }
    });
}
Events.on(engine, 'collisionStart', verificarImpactoFisico);

const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };
window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

Events.on(engine, 'beforeUpdate', () => {
    let now = Date.now();
    if (activeEffect && !isTransitioning) {
        if (now > effectEndTime) { isTransitioning = true; transitionEndTime = now + 2000; limpiarEfectos(); }
    }

    if (!juegoActivo || estaDescendiendo || isSpawning || isTransitioning) return;
    
    const speed = activeEffect === 'negative' ? 0.10 : 0.13; 
    let force = { x: 0, y: 0 };
    if (keys.w || keys.ArrowUp) force.y -= speed; if (keys.s || keys.ArrowDown) force.y += speed;
    if (keys.a || keys.ArrowLeft) force.x -= speed; if (keys.d || keys.ArrowRight) force.x += speed;
    Body.applyForce(player, player.position, force);

    pozos.forEach(pozo => {
        if (Matter.Vector.magnitude(Matter.Vector.sub(player.position, {x: pozo.cx, y: pozo.cy})) < tileSize * 0.4 && puntos >= metaPuntos) {
            estaDescendiendo = true; factorDescentAnim = 0; pozoObjetivo = { x: pozo.cx, y: pozo.cy };
            let topBar = document.getElementById('top-bar');
            if(topBar) topBar.style.opacity = 0; 
        }
    });
});

function render() {
    let now = Date.now(); ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isSpawning) {
        spawnVZ -= 3.5; spawnZ += spawnVZ;
        if (spawnZ <= 0) { spawnZ = 0; spawnVZ *= -0.4; if (Math.abs(spawnVZ) < 2) { isSpawning = false; juegoActivo = true; } }
    }

    let cameraX = Math.max(0, Math.min(player.position.x - canvas.width / 2, mapWidth - canvas.width));
    let cameraY = Math.max(0, Math.min(player.position.y - canvas.height / 2, mapHeight - canvas.height));

    ctx.save(); ctx.translate(-cameraX, -cameraY);

    const startCol = Math.floor(cameraX / tileSize) - 1; const endCol = startCol + Math.ceil(canvas.width / tileSize) + 2;
    const startRow = Math.floor(cameraY / tileSize) - 1; const endRow = startRow + Math.ceil(canvas.height / tileSize) + 2;
    
    let isWhiteEffect = activeEffect === 'positive';

    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            let isDark = (row + col) % 2 === 0;
            ctx.fillStyle = isWhiteEffect ? (isDark ? '#cca8b0' : '#e0c7cc') : (isDark ? '#14161a' : '#1a1d22'); 
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
    }

    pozos.forEach(pozo => {
        if (puntos >= metaPuntos) {
            let gradPozo = ctx.createRadialGradient(pozo.cx, pozo.cy, 10, pozo.cx, pozo.cy, tileSize/1.2);
            gradPozo.addColorStop(0, '#000000'); gradPozo.addColorStop(1, 'rgba(0,0,0,0)'); 
            ctx.fillStyle = gradPozo; ctx.fillRect(pozo.x, pozo.y, tileSize, tileSize);
        } else {
            ctx.fillStyle = 'rgba(20, 5, 5, 0.8)'; ctx.fillRect(pozo.x, pozo.y, tileSize, tileSize);
            ctx.strokeStyle = 'rgba(140, 32, 65, 0.5)'; ctx.lineWidth = 4;
            ctx.strokeRect(pozo.x + 5, pozo.y + 5, tileSize - 10, tileSize - 10);
            ctx.beginPath(); ctx.moveTo(pozo.x + 20, pozo.y + 20); ctx.lineTo(pozo.x + tileSize - 20, pozo.y + tileSize - 20);
            ctx.moveTo(pozo.x + tileSize - 20, pozo.y + 20); ctx.lineTo(pozo.x + 20, pozo.y + tileSize - 20); ctx.stroke();
        }
    });

    ctx.fillStyle = '#08090a'; const wt = 100;
    ctx.fillRect(0, -wt, mapWidth, wt); ctx.fillRect(0, mapHeight, mapWidth, wt);
    ctx.fillRect(-wt, 0, wt, mapHeight); ctx.fillRect(mapWidth, 0, wt, mapHeight);

    for (let i = fragmentosActivos.length - 1; i >= 0; i--) {
        let f = fragmentosActivos[i]; f.life--;
        if (f.life <= 0) { World.remove(world, f); fragmentosActivos.splice(i, 1); }
    }

    const cuerposStanding = Composite.allBodies(world).filter(b => b.isPillar || b.isModifier || b.isPlayer || b.isFragment || b.isGlass);
    pilaresCayendo.forEach(p => cuerposStanding.push({ isFallingAnim: true, data: p, position: { x: p.x, y: p.y } }));

    const glassPositions = new Set();
    cuerposStanding.forEach(body => { if (body.isGlass) glassPositions.add(`${Math.round(body.position.x)},${Math.round(body.position.y)}`); });

    let lightSource = { x: player.position.x, y: player.position.y };
    if (estaDescendiendo) {
        lightSource.x += (pozoObjetivo.x - player.position.x) * factorDescentAnim; lightSource.y += (pozoObjetivo.y - player.position.y) * factorDescentAnim;
    }

    cuerposStanding.forEach(body => {
        if (body.isPlayer && !estaDescendiendo) {
            let shadowScale = isSpawning ? 1 + (spawnZ / 200) : 1; let shadowAlpha = isSpawning ? Math.max(0.1, 0.6 - (spawnZ / 1000)) : 0.6;
            ctx.save(); ctx.translate(player.position.x - player.velocity.x * 2.5, player.position.y + 15 - player.velocity.y * 2.5);
            ctx.scale(shadowScale, shadowScale * 0.7); ctx.beginPath(); ctx.arc(0, 0, currentPlayerRadius, 0, 2*Math.PI); 
            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`; ctx.fill(); ctx.restore();
        } 
        else if (!isWhiteEffect) {
            if (body.isPillar || body.isGlass || body.isModifier) {
                let shadow = calcularSombraUnica(body.vertices, 90, lightSource);
                ctx.fillStyle = `rgba(0, 0, 0, ${(body.isGlass ? 0.22 : 0.95) * shadow.intensity})`; ctx.beginPath();
                body.vertices.forEach((v, i) => {
                    let nv = body.vertices[(i+1)%body.vertices.length];
                    ctx.moveTo(v.x, v.y); ctx.lineTo(nv.x, nv.y); ctx.lineTo(nv.x + shadow.sx, nv.y + shadow.sy); ctx.lineTo(v.x + shadow.sx, v.y + shadow.sy);
                }); ctx.fill();
            } else if (body.isFragment) {
                let shadow = calcularSombraUnica(body.vertices, 10, lightSource);
                ctx.globalAlpha = Math.max(0, body.life / 200); 
                ctx.fillStyle = `rgba(0, 0, 0, ${(body.isGlassShard ? 0.15 : 0.95) * shadow.intensity})`; ctx.beginPath();
                body.vertices.forEach((v, i) => {
                    let nv = body.vertices[(i+1)%body.vertices.length];
                    ctx.moveTo(v.x, v.y); ctx.lineTo(nv.x, nv.y); ctx.lineTo(nv.x + shadow.sx, nv.y + shadow.sy); ctx.lineTo(v.x + shadow.sx, v.y + shadow.sy);
                }); ctx.fill(); ctx.globalAlpha = 1.0;
            } else if (body.isFallingAnim) {
                let p = body.data; let currentZ = Math.max(10, 90 * Math.cos(Math.min(p.progress*p.progress, 1) * (Math.PI / 2))); 
                let shadow = calcularSombraUnica(p.vertices, currentZ, lightSource);
                ctx.fillStyle = `rgba(0, 0, 0, ${0.95 * shadow.intensity})`; ctx.beginPath();
                p.vertices.forEach((v, i) => {
                    let nv = p.vertices[(i+1)%p.vertices.length];
                    ctx.moveTo(v.x, v.y); ctx.lineTo(nv.x, nv.y); ctx.lineTo(nv.x + shadow.sx, nv.y + shadow.sy); ctx.lineTo(v.x + shadow.sx, v.y + shadow.sy);
                }); ctx.fill();
            }
        }
    });

    cuerposStanding.sort((a, b) => (a.position.y * 0.85 - a.position.x * 0.35) - (b.position.y * 0.85 - b.position.x * 0.35));
    
    cuerposStanding.forEach(body => {
        if (body.isPillar || body.isModifier) {
            dibujarCuerpo3D(ctx, body.vertices, palette[body.colorKey], 90, lightSource, false, 'normal', null, null, body.isModifier);
        } else if (body.isGlass) {
            dibujarCuerpo3D(ctx, body.vertices, '#a6dde5', 90, lightSource, true, body.glassState, body.impactPoint, glassPositions);
        } else if (body.isFragment) {
            ctx.globalAlpha = Math.max(0, body.life / 200); dibujarCuerpo3D(ctx, body.vertices, body.colorHex, 10, lightSource); ctx.globalAlpha = 1.0;
        } else if (body.isFallingAnim) {
            let p = body.data; p.progress += 0.03; dibujarCuboCayendo(ctx, p);
            if (p.progress >= 1 && !p.exploded) {
                p.exploded = true; let numFrags = 4 + Math.floor(Math.random() * 3);
                let spawnX = p.x + (p.fallDir.x * 45); let spawnY = p.y + (p.fallDir.y * 45);
                for (let i = 0; i < numFrags; i++) {
                    let frag = Bodies.rectangle(spawnX + (Math.random() * 30 - 15), spawnY + (Math.random() * 30 - 15), 20 + Math.random() * 15, 20 + Math.random() * 15, { frictionAir: 0.05, restitution: 0.2, density: 0.05 });
                    Body.setVelocity(frag, { x: Math.cos((Math.PI * 2 / numFrags) * i) * 7, y: Math.sin((Math.PI * 2 / numFrags) * i) * 7 });
                    frag.colorHex = p.colorHex; frag.isFragment = true; frag.life = 200; 
                    fragmentosActivos.push(frag); World.add(world, frag);
                }
            }
        } else if (body.isPlayer) {
            let pRadiusActual = currentPlayerRadius; let pX = lightSource.x; let pY = lightSource.y; let anguloGiroFisico = player.angle;
            if (estaDescendiendo) { pRadiusActual = currentPlayerRadius * (1 - factorDescentAnim); anguloGiroFisico = player.angle + factorDescentAnim * 25; }

            if (pRadiusActual > 0.1) {
                let renderX = pX; let renderY = pY;
                if (isSpawning) { renderX += spawnZ * 0.35; renderY -= spawnZ * 0.85; }

                ctx.save(); ctx.translate(renderX, renderY); ctx.beginPath(); ctx.arc(0, 0, pRadiusActual, 0, 2*Math.PI); ctx.clip(); 
                ctx.fillStyle = isWhiteEffect ? '#ffffff' : '#111'; ctx.fill(); 
                ctx.rotate(anguloGiroFisico); ctx.fillStyle = isWhiteEffect ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)'; 
                ctx.beginPath(); ctx.arc(0, 0, pRadiusActual, 0, Math.PI); ctx.fill(); ctx.restore();
                
                ctx.save(); ctx.translate(renderX, renderY);
                const ballGradient = ctx.createRadialGradient(-pRadiusActual*0.4, -pRadiusActual*0.4, pRadiusActual*0.05, 0, 0, pRadiusActual);
                if (isWhiteEffect) {
                    ballGradient.addColorStop(0, 'rgba(255,255,255,1)'); ballGradient.addColorStop(0.5, 'rgba(255,255,255,0.4)'); ballGradient.addColorStop(1, 'rgba(150,150,150,0.8)'); 
                } else {
                    ballGradient.addColorStop(0, 'rgba(255,255,255,0.7)'); ballGradient.addColorStop(0.3, 'rgba(20,20,20,0)'); ballGradient.addColorStop(1, 'rgba(0,0,0,0.9)'); 
                }
                ctx.beginPath(); ctx.arc(0, 0, pRadiusActual, 0, 2*Math.PI); ctx.fillStyle = ballGradient; ctx.fill(); ctx.restore();
            }
        }
    });

    pilaresCayendo = pilaresCayendo.filter(p => !p.exploded);

    if (estaDescendiendo) {
        factorDescentAnim += 0.02; 
        if (factorDescentAnim >= 1.0) {
            estaDescendiendo = false; 
            let topBar = document.getElementById('top-bar');
            if(topBar) topBar.style.opacity = 1; 
            generarMapa(); 
        }
    }

    ctx.restore(); 

    let renderPlayerScreenX = player.position.x - cameraX; let renderPlayerScreenY = player.position.y - cameraY;
    if (isSpawning) { renderPlayerScreenX += spawnZ * 0.35; renderPlayerScreenY -= spawnZ * 0.85; }

    let flickerMult = 1;
    if (activeEffect && !isTransitioning) {
        let timeLeft = effectEndTime - now;
        if (timeLeft < 3000 && Math.floor(now / 150) % 2 === 0) flickerMult = 0.5 + Math.random() * 0.3; 
    }

    let targetLight = isWhiteEffect ? 900 : 450;
    const lightRadius = estaDescendiendo ? Math.max(10, targetLight * (1 - factorDescentAnim)) : (targetLight * flickerMult);
    
    const darkGradient = ctx.createRadialGradient(renderPlayerScreenX, renderPlayerScreenY, currentPlayerRadius + 20, renderPlayerScreenX, renderPlayerScreenY, lightRadius);
    darkGradient.addColorStop(0, 'rgba(5, 5, 5, 0)'); darkGradient.addColorStop(0.5, 'rgba(5, 5, 5, 0.6)'); darkGradient.addColorStop(1, 'rgba(5, 5, 5, 0.99)');
    ctx.fillStyle = darkGradient; ctx.fillRect(0, 0, canvas.width, canvas.height);

    pozos.forEach(pozo => {
        if (puntos < metaPuntos) {
            let dist = Matter.Vector.magnitude(Matter.Vector.sub(player.position, {x: pozo.cx, y: pozo.cy}));
            if (dist < tileSize * 1.5) dibujarGloboDialogo(ctx, pozo.cx - cameraX, pozo.cy - cameraY, `Meta: ${metaPuntos} pts`);
        }
    });

    if (isTransitioning) {
        let timeLeft = transitionEndTime - now;
        let alpha = 1;
        if (timeLeft > 1500) alpha = 1 - (timeLeft - 1500) / 500; 
        else if (timeLeft < 500) alpha = Math.max(0, timeLeft / 500); 
        ctx.fillStyle = `rgba(5, 5, 5, ${Math.min(1, alpha)})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (timeLeft <= 0) isTransitioning = false;
    }

    requestAnimationFrame(render);
}

Engine.run(engine); generarMapa(); render(); window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });