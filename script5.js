document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    const drawButton = document.getElementById('draw-button');
    const algorithmSelect = document.getElementById('algorithm-select');
    
    const rectInputs = document.getElementById('rect-inputs');
    const polygonInputs = document.getElementById('polygon-inputs');
    
    function draw() {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(1, -1);
        
        drawCoordinateSystem(ctx, canvas.width, canvas.height, 50);

        const linesStr = document.getElementById('lines-input').value.trim().split('\n');
        const lines = linesStr.map(line => line.split(/[ ,]+/).map(Number));

        const selectedAlgorithm = algorithmSelect.value;

        if (selectedAlgorithm === 'liang-barsky') {
            const rectStr = document.getElementById('clipping-rect').value.split(/[ ,]+/).map(Number);
            const [xmin, ymin, xmax, ymax] = rectStr;

            lines.forEach(line => {
                drawLine(line[0], line[1], line[2], line[3], '#cccccc');
            });
            
            drawRect(xmin, ymin, xmax, ymax, 'blue');
            
            lines.forEach(line => {
                const clippedLine = liangBarsky(line[0], line[1], line[2], line[3], xmin, ymin, xmax, ymax);
                if (clippedLine) {
                    drawLine(clippedLine.x1, clippedLine.y1, clippedLine.x2, clippedLine.y2, 'red', 2);
                }
            });

        } else if (selectedAlgorithm === 'cyrus-beck') {
             const polygonStr = document.getElementById('clipping-polygon').value.trim().split(',');
             const polygon = polygonStr.map(p => p.trim().split(/[ ,]+/).map(Number));

            lines.forEach(line => {
                drawLine(line[0], line[1], line[2], line[3], '#cccccc');
            });

            drawPolygon(polygon, 'blue');

            lines.forEach(line => {
                const clippedLine = cyrusBeck(line[0], line[1], line[2], line[3], polygon);
                 if (clippedLine) {
                    drawLine(clippedLine.x1, clippedLine.y1, clippedLine.x2, clippedLine.y2, 'red', 2);
                }
            });
        }
        
        ctx.restore();
    }

    function drawCoordinateSystem(ctx, width, height, step) {
        const halfWidth = width / 2;
        const halfHeight = height / 2;
    
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
    
        for (let x = -halfWidth; x < halfWidth; x += step) {
            ctx.moveTo(x, -halfHeight);
            ctx.lineTo(x, halfHeight);
        }
        for (let y = -halfHeight; y < halfHeight; y += step) {
            ctx.moveTo(-halfWidth, y);
            ctx.lineTo(halfWidth, y);
        }
        ctx.stroke();
    
        ctx.beginPath();
        ctx.strokeStyle = '#aaaaaa';
        ctx.moveTo(-halfWidth, 0); ctx.lineTo(halfWidth, 0);
        ctx.moveTo(0, -halfHeight); ctx.lineTo(0, halfHeight);
        ctx.stroke();
        
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#999999';
        ctx.save();
        ctx.scale(1, -1);
        for (let x = -halfWidth + step; x < halfWidth; x += step) {
            if (x !== 0) ctx.fillText(x, x + 2, 12);
        }
        for (let y = -halfHeight + step; y < halfHeight; y += step) {
            if (y !== 0) ctx.fillText(y, 2, -y + 4);
        }
        ctx.restore();
    }

    function drawLine(x1, y1, x2, y2, color, width = 1) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    function drawRect(xmin, ymin, xmax, ymax, color) {
        ctx.beginPath();
        ctx.rect(xmin, ymin, xmax - xmin, ymax - ymin);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    function drawPolygon(points, color) {
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    function liangBarsky(x1, y1, x2, y2, xmin, ymin, xmax, ymax) {
        let dx = x2 - x1;
        let dy = y2 - y1;
        let t0 = 0, t1 = 1;
        
        const p = [-dx, dx, -dy, dy];
        const q = [x1 - xmin, xmax - x1, y1 - ymin, ymax - y1];
        
        for (let i = 0; i < 4; i++) {
            if (p[i] === 0) { 
                if (q[i] < 0) return null; 
            } else {
                let t = q[i] / p[i];
                if (p[i] < 0) { 
                    t0 = Math.max(t0, t);
                } else { 
                    t1 = Math.min(t1, t);
                }
            }
        }
        
        if (t0 > t1) return null; 

        return {
            x1: x1 + t0 * dx,
            y1: y1 + t0 * dy,
            x2: x1 + t1 * dx,
            y2: y1 + t1 * dy
        };
    }

    function cyrusBeck(x1, y1, x2, y2, polygon) {
        let tEnter = 0, tLeave = 1;
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        const D = { x: dx, y: dy };

        for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % polygon.length]; 
            
            const normal = { x: p1[1] - p2[1], y: p2[0] - p1[0] };
            
            const w = { x: x1 - p1[0], y: y1 - p1[1] };
            
            const D_dot_N = D.x * normal.x + D.y * normal.y;
            const W_dot_N = w.x * normal.x + w.y * normal.y;
            
            if (D_dot_N !== 0) {
                const t = -W_dot_N / D_dot_N;
                if (D_dot_N > 0) { 
                    tEnter = Math.max(tEnter, t);
                } else { 
                    tLeave = Math.min(tLeave, t);
                }
            } else {
                if (W_dot_N < 0) return null; 
            }
        }

        if (tEnter > tLeave) return null; 

        return {
            x1: x1 + tEnter * dx,
            y1: y1 + tEnter * dy,
            x2: x1 + tLeave * dx,
            y2: y1 + tLeave * dy,
        };
    }
    
    const coordsDisplay = document.getElementById('coords-display');

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x_screen = event.clientX - rect.left;
        const y_screen = event.clientY - rect.top;

        const x_math = x_screen - canvas.width / 2;
        const y_math = canvas.height / 2 - y_screen;

        coordsDisplay.textContent = `Координаты: (${Math.round(x_math)}, ${Math.round(y_math)})`;
    });

    canvas.addEventListener('mouseleave', () => {
        coordsDisplay.textContent = 'Наведите курсор на холст';
    });
    
    drawButton.addEventListener('click', draw);
    algorithmSelect.addEventListener('change', (e) => {
        if (e.target.value === 'liang-barsky') {
            rectInputs.classList.remove('hidden');
            polygonInputs.classList.add('hidden');
        } else {
            rectInputs.classList.add('hidden');
            polygonInputs.classList.remove('hidden');
        }
        draw(); 
    });

    draw();
});