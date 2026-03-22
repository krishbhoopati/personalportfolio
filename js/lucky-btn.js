document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('lucky-btn');
    if (!btn) return;

    var { animate, spring } = popmotion;

    var x = 0, y = 0;
    var animX, animY;

    function springBack() {
        if (animX) animX.stop();
        if (animY) animY.stop();
        animX = animate({
            from: x, to: 0,
            type: spring, stiffness: 300, damping: 15, mass: 0.8,
            onUpdate: function (v) { x = v; applyTransform(); }
        });
        animY = animate({
            from: y, to: 0,
            type: spring, stiffness: 300, damping: 15, mass: 0.8,
            onUpdate: function (v) { y = v; applyTransform(); }
        });
    }

    function applyTransform() {
        btn.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    }

    btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = (e.clientX - cx) * 0.35;
        var dy = (e.clientY - cy) * 0.35;
        if (animX) animX.stop();
        if (animY) animY.stop();
        x = dx; y = dy;
        applyTransform();
    });

    btn.addEventListener('mouseleave', function () {
        springBack();
    });

    btn.addEventListener('mousedown', function () {
        animate({
            from: 1, to: 0.92,
            duration: 80,
            onUpdate: function (v) {
                btn.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + v + ')';
            }
        });
    });

    btn.addEventListener('mouseup', function () {
        animate({
            from: 0.92, to: 1,
            type: spring, stiffness: 400, damping: 12,
            onUpdate: function (v) {
                btn.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + v + ')';
            }
        });
    });
});
