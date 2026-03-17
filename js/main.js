document.addEventListener('loaderDone', function() {
    var content = document.getElementById('site-content');
    if (content) content.classList.add('visible');
    var canvas = document.getElementById('c');
    if (canvas) canvas.style.display = 'none';
});

function updateGrid() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cols = Math.round(w / 60);
    const rows = Math.round(h / 60);
    document.documentElement.style.setProperty('--grid-w', `${w / cols}px`);
    document.documentElement.style.setProperty('--grid-h', `${h / rows}px`);
}
updateGrid();
window.addEventListener('resize', () => { updateGrid(); snapToGrid(); });

const VERTICAL_OFFSET = -60; // px nudge upward

function snapToGrid() {
    const tower = document.getElementById('cn-tower-img');
    const main = document.getElementById('hero-main');
    if (!tower || !main) return;
    const gridH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid-h')) || 60;
    main.style.transform = `translateY(${VERTICAL_OFFSET}px)`;
    const towerBottom = tower.getBoundingClientRect().bottom;
    const snapped = Math.round(towerBottom / gridH) * gridH;
    const adjustment = snapped - towerBottom;
    main.style.transform = `translateY(${VERTICAL_OFFSET + adjustment}px)`;
}

// Wait for fonts + layout to settle
if (document.fonts) {
    document.fonts.ready.then(() => requestAnimationFrame(snapToGrid));
} else {
    window.addEventListener('load', () => requestAnimationFrame(snapToGrid));
}

document.addEventListener('mousemove', (e) => {
    const x = (window.innerWidth / 2 - e.pageX) / 50;
    const y = (window.innerHeight / 2 - e.pageY) / 50;

    const bgFlowers = document.querySelectorAll('#flowers > div');
    bgFlowers.forEach((f, index) => {
        const speed = (index + 1) * 0.5;
        f.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
    });
});
