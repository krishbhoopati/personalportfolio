sessionStorage.removeItem('introSeen');
if (true) {
  // sessionStorage.setItem('introSeen', '1'); // disabled for testing

var asphaltImg = null;
var carImg = null;
var carLoaded = false;

carImg = new Image();
carImg.onload = function(){ carLoaded = true; console.log("Car loaded: " + carImg.width + "x" + carImg.height); };
carImg.onerror = function(){ console.error("Failed to load car image"); };
carImg.src = "r34_car_sprite.png";

var C = document.getElementById('c');
var X = C.getContext('2d');
var W, H, CX, CY, RAD, SC;

function resize(){
  W = C.width = innerWidth;
  H = C.height = innerHeight;
  CX = W/2;
  CY = H/2;
  SC = Math.min(W,H)/700;
  RAD = Math.min(W,H)*0.17;
  genAsphalt();
  initMarks();
}

function genAsphalt(){
  var ac = document.createElement('canvas');
  ac.width = W; ac.height = H;
  var ax = ac.getContext('2d');
  ax.fillStyle = '#1c1c1c';
  ax.fillRect(0,0,W,H);
  for(var i=0;i<4000;i++){
    var v = Math.floor(Math.random()*18+20);
    ax.fillStyle = 'rgb('+v+','+v+','+v+')';
    ax.fillRect(Math.random()*W|0, Math.random()*H|0, 1+(Math.random()*2|0), 1+(Math.random()*2|0));
  }
  asphaltImg = ac;
}

resize();
window.addEventListener('resize', resize);

var SPEED = 0.035;
var TWO_LAPS = Math.PI * 4;
var angle = 0;
var frame = 0;
var phase = 'drift';
var smokeFillAlpha = 0;
var tireMarks = [];
var smoke = [];
var smokeStamp = null;
function genSmokeStamp(){
  var size = 256;
  var sc = document.createElement('canvas');
  sc.width = sc.height = size;
  var sx = sc.getContext('2d');
  var g = sx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0,   'rgba(160,160,160,0.85)');
  g.addColorStop(0.3, 'rgba(160,160,160,0.5)');
  g.addColorStop(0.6, 'rgba(160,160,160,0.2)');
  g.addColorStop(1,   'rgba(160,160,160,0)');
  sx.fillStyle = g;
  sx.beginPath();
  sx.arc(size/2, size/2, size/2, 0, Math.PI*2);
  sx.fill();
  smokeStamp = sc;
}
genSmokeStamp();

// Car sprite is portrait: ~78 wide x 180 tall (nose at top of image)
// We scale it relative to screen
var CAR_W, CAR_H;
function updateCarSize(){
  CAR_H = 130 * SC; // length (nose to tail)
  CAR_W = CAR_H * (78/180); // maintain aspect ratio
}

function drawCar(x, y, rot){
  if(!carLoaded) return;

  X.save();
  X.translate(x, y);
  // The car image: nose at TOP of image = -Y direction in canvas
  // rot = the car's heading angle in world space
  // To align image-top (nose) with the heading direction, we add PI/2
  X.rotate(rot + Math.PI/2);

  // Shadow
  X.globalAlpha = 0.45;
  X.fillStyle = '#000';
  X.beginPath();
  X.ellipse(3*SC, 4*SC, CAR_W/2 + 3*SC, CAR_H/2 + 3*SC, 0, 0, Math.PI*2);
  X.fill();
  X.globalAlpha = 1;

  // Draw the car
  X.drawImage(carImg, -CAR_W/2, -CAR_H/2, CAR_W, CAR_H);
  X.restore();
}

// Smoke system
function spawnSmoke(sx, sy, vxB, vyB, heavy){
  var n = heavy ? 8 : 4;
  for(var i=0; i<n; i++){
    var spread = heavy ? 14 : 6;
    smoke.push({
      x: sx + (Math.random()-0.5)*spread*SC,
      y: sy + (Math.random()-0.5)*spread*SC,
      vx: vxB*0.5 + (Math.random()-0.5)*2.0,
      vy: vyB*0.5 + (Math.random()-0.5)*2.0,
      sz: (8 + Math.random()*12)*SC,
      mx: (40 + Math.random()*70)*SC,
      gr: 0.25 + Math.random()*0.4,
      life: 1,
      dc: 0.0015 + Math.random()*0.003,
      c: Math.floor(Math.random()*80 + 120),
      t: Math.random()*0.4
    });
  }
}

// Two separate tracks for left and right rear wheels
var trackL = {px:0, py:0, has:false};
var trackR = {px:0, py:0, has:false};
var marksCanvas = null;
var marksCtx = null;

function initMarks(){
  marksCanvas = document.createElement('canvas');
  marksCanvas.width = W;
  marksCanvas.height = H;
  marksCtx = marksCanvas.getContext('2d');
}

function drawMark(track, nx, ny){
  if(!marksCtx) return;
  if(track.has){
    marksCtx.strokeStyle = 'rgba(0,0,0,0.7)';
    marksCtx.lineWidth = 4 * SC;
    marksCtx.lineCap = 'round';
    marksCtx.lineJoin = 'round';
    marksCtx.beginPath();
    marksCtx.moveTo(track.px, track.py);
    marksCtx.lineTo(nx, ny);
    marksCtx.stroke();
  }
  track.px = nx;
  track.py = ny;
  track.has = true;
}

function loop(){
  frame++;
  if(phase === 'done') return;

  if(phase === 'drift'){
    angle += SPEED;
    if(angle >= TWO_LAPS) phase = 'smokefill';
  }

  if(phase === 'smokefill'){
    angle += SPEED * 0.7;
    smokeFillAlpha += 0.012;
    if(smokeFillAlpha >= 1){
      phase = 'done';
      C.style.display = 'none';
      document.dispatchEvent(new CustomEvent('loaderDone'));
      return;
    }
  }

  updateCarSize();

  // Car position on donut circle
  var cx = CX + Math.cos(angle)*RAD;
  var cy = CY + Math.sin(angle)*RAD;
  var drift = 0.48;
  var cr = angle + Math.PI/2 + drift;

  // Rear tire positions - rear is OPPOSITE the heading direction
  // cr is the heading angle, so rear = cr + PI direction from center
  var rearDirX = -Math.cos(cr); // opposite of heading
  var rearDirY = -Math.sin(cr);
  var rX = cx + rearDirX * CAR_H * 0.42;
  var rY = cy + rearDirY * CAR_H * 0.42;
  // Side offset (perpendicular to heading) for left/right rear wheels
  var sX = -Math.sin(cr) * CAR_W * 0.48;
  var sY = Math.cos(cr) * CAR_W * 0.48;
  // Smoke drift direction (outward from center of donut)
  var oX = rearDirX * 2.0;
  var oY = rearDirY * 2.0;

  // Tire marks - two continuous burn lines for each rear wheel
  drawMark(trackL, rX+sX, rY+sY);
  drawMark(trackR, rX-sX, rY-sY);

  // Smoke - ramps up over time
  var prog = angle / TWO_LAPS;
  var heavy = prog > 0.2 && frame%2===0;
  spawnSmoke(rX+sX*1.2, rY+sY*1.2, oX, oY, heavy);
  spawnSmoke(rX-sX*1.2, rY-sY*1.2, oX, oY, heavy);

  if(prog > 0.5 && frame%3===0){
    spawnSmoke(rX+sX*2, rY+sY*2, oX*3, oY*3, true);
    spawnSmoke(rX-sX*2, rY-sY*2, oX*3, oY*3, true);
  }

  if(prog > 0.8 && frame%2===0){
    for(var i=0;i<3;i++){
      spawnSmoke(rX+(Math.random()-0.5)*60*SC, rY+(Math.random()-0.5)*60*SC, oX*4, oY*4, true);
    }
  }

  // Fill phase - screen-wide smoke
  if(phase === 'smokefill' && frame%2===0){
    for(var i=0;i<6;i++){
      smoke.push({
        x: Math.random()*W, y: Math.random()*H,
        vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2,
        sz: 50*SC + Math.random()*60*SC,
        mx: 120*SC + Math.random()*150*SC,
        gr: 0.7 + Math.random()*0.6,
        life: 1, dc: 0.002 + Math.random()*0.003,
        c: Math.floor(Math.random()*50+160), t: 0.15
      });
    }
  }

  // Update smoke particles
  for(var i=smoke.length-1; i>=0; i--){
    var p = smoke[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.997; p.vy *= 0.997;
    p.vx += (Math.random()-0.5)*p.t;
    p.vy += (Math.random()-0.5)*p.t;
    p.sz = Math.min(p.sz + p.gr, p.mx);
    p.life -= p.dc;
    if(p.life <= 0) smoke.splice(i,1);
  }

  // === RENDER ===
  if(asphaltImg){
    X.drawImage(asphaltImg, 0, 0);
  } else {
    X.fillStyle = '#1c1c1c';
    X.fillRect(0,0,W,H);
  }

  // Tire burn marks (persistent on separate canvas)
  if(marksCanvas){
    X.drawImage(marksCanvas, 0, 0);
  }

  // Smoke particles
  for(var i=0; i<smoke.length; i++){
    var p = smoke[i];
    if(p.life < 0.01) continue;
    X.globalAlpha = p.life * 0.55;
    X.drawImage(smokeStamp, p.x - p.sz, p.y - p.sz, p.sz * 2, p.sz * 2);
  }
  X.globalAlpha = 1;

  // Car on top
  drawCar(cx, cy, cr);

  // Smoke fill overlay
  if(smokeFillAlpha > 0){
    X.fillStyle = 'rgba(160,160,160,' + Math.min(1, smokeFillAlpha*0.85) + ')';
    X.fillRect(0,0,W,H);
  }

  requestAnimationFrame(loop);
}

loop();

} else {
  document.addEventListener('DOMContentLoaded', function() {
    var content = document.getElementById('site-content');
    if (content) { content.classList.add('visible'); }
    var canvas = document.getElementById('c');
    if (canvas) { canvas.style.display = 'none'; }
  });
}
