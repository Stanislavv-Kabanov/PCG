document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('rasterCanvas');
    const ctx = canvas.getContext('2d');
    
    let scale = 20;
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;

    const scaleSlider = document.getElementById('scale');
    const scaleValueSpan = document.getElementById('scaleValue');

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        centerX = canvas.width / 2;
        centerY = canvas.height / 2;

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        for (let x = centerX % scale; x <= canvas.width; x += scale) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        for (let y = centerY % scale; y <= canvas.height; y += scale) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        ctx.strokeStyle = '#616161';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 1; (centerX + i * scale) < canvas.width; i++) {
            if (i % 5 === 0) {
                ctx.fillText(i, centerX + i * scale, centerY + 15);
                ctx.fillText(-i, centerX - i * scale, centerY + 15);
            }
        }
        for (let i = 1; (centerY - i * scale) > 0; i++) {
             if (i % 5 === 0) {
                ctx.fillText(i, centerX - 15, centerY - i * scale);
                ctx.fillText(-i, centerX - 15, centerY + i * scale);
            }
        }
    }
    
    function putPixel(x, y, color = 'black') {
        ctx.fillStyle = color;
        ctx.fillRect(centerX + x * scale, centerY - y * scale - scale, scale, scale);
    }

    function clearCanvas() {
        document.getElementById('timingResults').innerHTML = '';
        document.getElementById('results-log').innerHTML = '';
        drawGrid();
    }

    scaleSlider.addEventListener('input', (e) => {
        scale = parseInt(e.target.value);
        scaleValueSpan.textContent = `${scale}px`;
        drawGrid();
    });
    
    
    function stepByStep(x1, y1, x2, y2, color, log) {
        if (x1 > x2) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; }
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        log?.push(`Начало: (${x1},${y1}), Конец: (${x2},${y2}), dx=${dx}, dy=${dy}`);

        if (dx === 0 && dy === 0) {
            putPixel(x1, y1, color);
            return;
        }

        if (Math.abs(dx) >= Math.abs(dy)) {
            const m = dy / dx;
            const b = y1 - m * x1;
            log?.push(`Итерация по X. Наклон m = ${m.toFixed(2)}`);
            for (let x = x1; x <= x2; x++) {
                const y = Math.round(m * x + b);
                putPixel(x, y, color);
                log?.push(`x=${x}, y_calc=${(m * x + b).toFixed(2)}, y_round=${y}. Рисуем пиксель (${x}, ${y})`);
            }
        } else {
            if (y1 > y2) { [y1, y2] = [y2, y1]; [x1, x2] = [x2, x1]; }
            const m_inv = dx / dy;
            const b_inv = x1 - m_inv * y1;
            log?.push(`Итерация по Y. Обратный наклон m_inv = ${m_inv.toFixed(2)}`);
             for (let y = y1; y <= y2; y++) {
                const x = Math.round(m_inv * y + b_inv);
                putPixel(x, y, color);
                log?.push(`y=${y}, x_calc=${(m_inv * y + b_inv).toFixed(2)}, x_round=${x}. Рисуем пиксель (${x}, ${y})`);
            }
        }
    }

    function dda(x1, y1, x2, y2, color, log) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        const xIncrement = dx / steps;
        const yIncrement = dy / steps;
        
        log?.push(`Начало: (${x1},${y1}), Конец: (${x2},${y2}), steps=${steps}`);
        log?.push(`Приращения: dx_inc=${xIncrement.toFixed(3)}, dy_inc=${yIncrement.toFixed(3)}`);
        
        let x = x1;
        let y = y1;
        for (let i = 0; i <= steps; i++) {
            const xr = Math.round(x);
            const yr = Math.round(y);
            putPixel(xr, yr, color);
            log?.push(`i=${i}, (x,y)=(${(x).toFixed(2)},${(y).toFixed(2)}). Рисуем пиксель (${xr}, ${yr})`);
            x += xIncrement;
            y += yIncrement;
        }
    }

    function bresenhamLine(x1, y1, x2, y2, color, log) {
        let dx = Math.abs(x2 - x1);1    
        let dy = -Math.abs(y2 - y1);
        let sx = (x1 < x2) ? 1 : -1;
        let sy = (y1 < y2) ? 1 : -1;
        let err = dx + dy;
        
        log?.push(`Начало: (${x1},${y1}), Конец: (${x2},${y2}), dx=${dx}, dy=${-dy}`);
        
        while(true) {
            putPixel(x1, y1, color);
            log?.push(`Рисуем (${x1},${y1}). err=${err}`);

            if ((x1 === x2) && (y1 === y2)) break;
            
            let e2 = 2 * err;
            if (e2 >= dy) { 
                err += dy; 
                x1 += sx; 
                log?.push(`e2>=dy. err=${err}, x=${x1}`);
            }
            if (e2 <= dx) { 
                err += dx; 
                y1 += sy; 
                log?.push(`e2<=dx. err=${err}, y=${y1}`);
            }
        }
    }

    function bresenhamCircle(xc, yc, r, color, log) {
        let x = 0;
        let y = r;
        let d = 3 - 2 * r;
        log?.push(`Центр: (${xc},${yc}), r=${r}. Начало: x=0, y=${r}, d=${d}`);
        
        while (y >= x) {
            putPixel(xc + x, yc + y, color); putPixel(xc - x, yc + y, color);
            putPixel(xc + x, yc - y, color); putPixel(xc - x, yc - y, color);
            putPixel(xc + y, yc + x, color); putPixel(xc - y, yc + x, color);
            putPixel(xc + y, yc - x, color); putPixel(xc - y, yc - x, color);
            log?.push(`Рисуем 8 симметричных точек для (x,y)=(${x},${y}). d=${d}`);

            x++;
            if (d > 0) {
                y--;
                d = d + 4 * (x - y) + 10;
                log?.push(`d>0. Новый y=${y}, d=${d}`);
            } else {
                d = d + 4 * x + 6;
                log?.push(`d<=0. d=${d}`);
            }
        }
    }


    document.getElementById('drawButton').addEventListener('click', () => {
        drawGrid();
        const showLogs = document.getElementById('showLogs').checked;
        const timingResultsDiv = document.getElementById('timingResults');
        const logDiv = document.getElementById('results-log');
        timingResultsDiv.innerHTML = '';
        logDiv.innerHTML = '';

        const x1 = parseInt(document.getElementById('x1').value);
        const y1 = parseInt(document.getElementById('y1').value);
        const x2 = parseInt(document.getElementById('x2').value);
        const y2 = parseInt(document.getElementById('y2').value);
        const xc = parseInt(document.getElementById('xc').value);
        const yc = parseInt(document.getElementById('yc').value);
        const r = parseInt(document.getElementById('r').value);

        const runAndMeasure = (name, color, func, ...args) => {
            const log = showLogs ? [] : null;
            const startTime = performance.now();
            func(...args, color, log);
            const endTime = performance.now();
            
            const time = endTime - startTime;
            timingResultsDiv.innerHTML += `<p>${name}: ${time.toFixed(8)} мс</p>`;
            if (showLogs && log) {
                logDiv.innerHTML += `<strong>--- ${name} ---</strong>\n${log.join('\n')}\n\n`;
            }
        };
        
        if (document.getElementById('runStepByStep').checked) runAndMeasure('Пошаговый', 'red', stepByStep, x1, y1, x2, y2);
        if (document.getElementById('runDda').checked) runAndMeasure('ЦДА', 'green', dda, x1, y1, x2, y2);
        if (document.getElementById('runBresenhamLine').checked) runAndMeasure('Брезенхем (отрезок)', 'blue', bresenhamLine, x1, y1, x2, y2);
        if (document.getElementById('runBresenhamCircle').checked) runAndMeasure('Брезенхем (окружность)', 'purple', bresenhamCircle, xc, yc, r);
    });

    document.getElementById('clearButton').addEventListener('click', clearCanvas);

    drawGrid();
});