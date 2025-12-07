document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        r: { range: document.getElementById('r-range'), input: document.getElementById('r-input') },
        g: { range: document.getElementById('g-range'), input: document.getElementById('g-input') },
        b: { range: document.getElementById('b-range'), input: document.getElementById('b-input') },
        x: { range: document.getElementById('x-range'), input: document.getElementById('x-input') },
        y: { range: document.getElementById('y-range'), input: document.getElementById('y-input') },
        z: { range: document.getElementById('z-range'), input: document.getElementById('z-input') },
        h: { range: document.getElementById('h-range'), input: document.getElementById('h-input') },
        s: { range: document.getElementById('s-range'), input: document.getElementById('s-input') },
        v: { range: document.getElementById('v-range'), input: document.getElementById('v-input') },
        gamutWarning: document.getElementById('gamut-warning'),
        colorPicker: document.getElementById('color-picker')
    };

    let isUpdating = false;

    function hexToRgb(hex) {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toLowerCase();
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        let d = max - min;
        s = max === 0 ? 0 : d / max;
        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
    }

    function hsvToRgb(h, s, v) {
        h /= 360; s /= 100; v /= 100;
        let r, g, b;
        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }
    
    function rgbToXyz(r, g, b) {
        let var_R = (r / 255 > 0.04045) ? Math.pow(((r / 255) + 0.055) / 1.055, 2.4) : (r / 255) / 12.92;
        let var_G = (g / 255 > 0.04045) ? Math.pow(((g / 255) + 0.055) / 1.055, 2.4) : (g / 255) / 12.92;
        let var_B = (b / 255 > 0.04045) ? Math.pow(((b / 255) + 0.055) / 1.055, 2.4) : (b / 255) / 12.92;

        var_R *= 100;
        var_G *= 100;
        var_B *= 100;

        const X = var_R * 0.4124 + var_G * 0.3576 + var_B * 0.1805;
        const Y = var_R * 0.2126 + var_G * 0.7152 + var_B * 0.0722;
        const Z = var_R * 0.0193 + var_G * 0.1192 + var_B * 0.9505;
        
        return { x: X, y: Y, z: Z };
    }

    function xyzToRgb(x, y, z) {
        let var_X = x / 100;
        let var_Y = y / 100;
        let var_Z = z / 100;

        let var_R = var_X *  3.2406 + var_Y * -1.5372 + var_Z * -0.4986;
        let var_G = var_X * -0.9689 + var_Y *  1.8758 + var_Z *  0.0415;
        let var_B = var_X *  0.0557 + var_Y * -0.2040 + var_Z *  1.0570;

        if (var_R > 0.0031308) var_R = 1.055 * Math.pow(var_R, 1/2.4) - 0.055; else var_R = 12.92 * var_R;
        if (var_G > 0.0031308) var_G = 1.055 * Math.pow(var_G, 1/2.4) - 0.055; else var_G = 12.92 * var_G;
        if (var_B > 0.0031308) var_B = 1.055 * Math.pow(var_B, 1/2.4) - 0.055; else var_B = 12.92 * var_B;
        
        let r = var_R * 255, g = var_G * 255, b = var_B * 255;
        let isOutOfGamut = false;
        if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
            isOutOfGamut = true;
        }
        
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        return { r: Math.round(r), g: Math.round(g), b: Math.round(b), outOfGamut: isOutOfGamut };
    }

    function updateUI(source, values) {
        if (isUpdating) return;
        isUpdating = true;
        
        let { r, g, b, x, y, z, h, s, v, outOfGamut } = values;

        elements.r.range.value = r; elements.r.input.value = r;
        elements.g.range.value = g; elements.g.input.value = g;
        elements.b.range.value = b; elements.b.input.value = b;
        
        elements.x.range.value = x.toFixed(3); elements.x.input.value = x.toFixed(3);
        elements.y.range.value = y.toFixed(3); elements.y.input.value = y.toFixed(3);
        elements.z.range.value = z.toFixed(3); elements.z.input.value = z.toFixed(3);

        elements.h.range.value = h; elements.h.input.value = h;
        elements.s.range.value = s; elements.s.input.value = s;
        elements.v.range.value = v; elements.v.input.value = v;

        elements.gamutWarning.classList.toggle('hidden', !outOfGamut);

        if (source !== 'picker') {
            elements.colorPicker.value = rgbToHex(r, g, b);
        }

        isUpdating = false;
    }


    function updateFromRGB() {
        const r = parseInt(elements.r.input.value);
        const g = parseInt(elements.g.input.value);
        const b = parseInt(elements.b.input.value);

        const xyz = rgbToXyz(r, g, b);
        const hsv = rgbToHsv(r, g, b);

        updateUI('rgb', { r, g, b, ...xyz, ...hsv, outOfGamut: false });
    }

    function updateFromHSV() {
        const h = parseInt(elements.h.input.value);
        const s = parseInt(elements.s.input.value);
        const v = parseInt(elements.v.input.value);

        const { r, g, b } = hsvToRgb(h, s, v);
        const xyz = rgbToXyz(r, g, b);

        updateUI('hsv', { r, g, b, h, s, v, ...xyz, outOfGamut: false });
    }
    
    function updateFromXYZ() {
        const x = parseFloat(elements.x.input.value);
        const y = parseFloat(elements.y.input.value);
        const z = parseFloat(elements.z.input.value);

        const { r, g, b, outOfGamut } = xyzToRgb(x, y, z);
        const hsv = rgbToHsv(r, g, b);

        updateUI('xyz', { r, g, b, x, y, z, ...hsv, outOfGamut });
    }

    function updateFromPicker() {
        const hex = elements.colorPicker.value;
        const rgb = hexToRgb(hex);

        if (rgb) {
            const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
            const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
            updateUI('picker', { ...rgb, ...xyz, ...hsv, outOfGamut: false });
        }
    }

    ['r', 'g', 'b'].forEach(c => {
        elements[c].range.addEventListener('input', () => { elements[c].input.value = elements[c].range.value; updateFromRGB(); });
        elements[c].input.addEventListener('input', () => { elements[c].range.value = elements[c].input.value; updateFromRGB(); });
    });
    
    ['x', 'y', 'z'].forEach(c => {
        elements[c].range.addEventListener('input', () => { elements[c].input.value = elements[c].range.value; updateFromXYZ(); });
        elements[c].input.addEventListener('input', () => { elements[c].range.value = elements[c].input.value; updateFromXYZ(); });
    });
    
    ['h', 's', 'v'].forEach(c => {
        elements[c].range.addEventListener('input', () => { elements[c].input.value = elements[c].range.value; updateFromHSV(); });
        elements[c].input.addEventListener('input', () => { elements[c].range.value = elements[c].input.value; updateFromHSV(); });
    });

    elements.colorPicker.addEventListener('input', updateFromPicker);

    function initialize() {
        const initialHex = "#8c3cd8";
        elements.colorPicker.value = initialHex;
        updateFromPicker();
    }
    
    initialize();
});