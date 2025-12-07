
const fileInputFiles = document.getElementById('fileInputFiles');
const fileInputFolder = document.getElementById('fileInputFolder');
const tbody = document.querySelector('#resultTable tbody');
const fileCountEl = document.getElementById('fileCount');
const totalSizeEl = document.getElementById('totalSize');
const progressFill = document.getElementById('progressFill');

fileInputFiles.addEventListener('change', (e) => handleFileSelection(e.target.files));
fileInputFolder.addEventListener('change', (e) => handleFileSelection(e.target.files));

async function handleFileSelection(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    tbody.innerHTML = '';
    progressFill.style.width = '0%';
    let totalSize = 0;

    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        try {
            const fileData = await processSingleFile(file);
            addTableRow(file, fileData);
            totalSize += file.size;
        } catch (error) {
            console.error(`Критическая ошибка при обработке файла ${file.name}:`, error);
            addErrorRow(file);
        }
        fileCountEl.textContent = `${i + 1} / ${imageFiles.length}`;
        totalSizeEl.textContent = (totalSize / (1024 * 1024)).toFixed(2);
        progressFill.style.width = `${((i + 1) / imageFiles.length) * 100}%`;
    }
}

async function processSingleFile(file) {
    const [basicInfo, metaInfo] = await Promise.all([
        getBasicImageInfo(file),
        getMetaData(file)
    ]);
    
    const colorDepth = await getColorDepth(file, metaInfo);

    return {
        ...basicInfo,
        format: file.name.split('.').pop().toUpperCase(),
        compression: getCompression(file, metaInfo),
        colorDepth: colorDepth
    };
}

async function getColorDepth(file, meta) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'bmp') {
        const bmpDepth = await readBmpBitDepth(file);
        if (bmpDepth !== null) {
            console.log(`[ОТЛАДКА BMP] Файл: ${file.name}. Прочитанная глубина: ${bmpDepth} бит.`);
            return `${bmpDepth} бит`;
        }
    }
    
    if (ext === 'png') {
        const pngDepth = await readPngBitDepth(file);
        if (pngDepth) return pngDepth;
    }   

    const bitsPerSample = meta?.ifd0?.BitsPerSample?.value;
    if (Array.isArray(bitsPerSample)) {
        return `${bitsPerSample.reduce((a, b) => a + b, 0)} бит`;
    }

    if (ext === 'gif') return '8 бит';
    if (ext === 'jpg' || ext === 'jpeg') return '24 бита';
    
    return 'Н/Д';
}

function readBmpBitDepth(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const dataView = new DataView(event.target.result);
                const bitDepth = dataView.getUint16(28, true);
                resolve(bitDepth);
            } catch {
                resolve(null);
            }
        };
        reader.onerror = () => resolve(null);
        reader.readAsArrayBuffer(file.slice(0, 30));
    });
}

async function readPngBitDepth(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const dataView = new DataView(event.target.result);

                const pngSignature = [0x89, 0x50, 0x4E, 0x47];
                for (let i = 0; i < 4; i++) {
                    if (dataView.getUint8(i) !== pngSignature[i]) {
                        resolve(null);
                        return;
                    }
                }

                const bitDepth = dataView.getUint8(24);
                const colorType = dataView.getUint8(25);

                let description = `${bitDepth} бит`;
                if (colorType === 2) description = `${bitDepth * 3} бит`;
                if (colorType === 6) description = `${bitDepth * 4} бит`;
                if (colorType === 3) description = `${bitDepth} бит (индекс.)`;

                resolve(description);
            } catch {
                resolve(null);
            }
        };
        reader.onerror = () => resolve(null);
        reader.readAsArrayBuffer(file.slice(0, 30));
    });
}


function getBasicImageInfo(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject("Не удалось прочитать размеры изображения");
        };
        img.src = url;
    });
}ф

async function getMetaData(file) {
    try {
        if (typeof ExifReader === 'undefined') return null;
        return await ExifReader.load(file);
    } catch {
        return null;
    }
}

function getDpi(meta) {
    return meta?.ifd0?.XResolution?.description ? `${meta.ifd0.XResolution.description} dpi` : '—';
}



function getCompression(file, meta) {
    if (meta?.ifd0?.Compression?.description) return meta.ifd0.Compression.description;
    const ext = file.name.split('.').pop().toLowerCase();
    switch (ext) {
        case 'jpg': case 'jpeg': return 'JPEG';
        case 'png': return 'LZ77';
        case 'gif': return 'LZW';
        case 'bmp': return 'Без сжатия';
    }
    return 'Н/Д';
}


function addTableRow(file, data) {
    const row = tbody.insertRow();
    row.innerHTML = `
        <td title="${file.webkitRelativePath || file.name}">${truncateName(file.name)}</td>
        <td>${data.format}</td>
        <td>${data.width} × ${data.height}</td>
        <td>${data.colorDepth}</td>
        <td>${data.compression}</td>
    `;
}

function addErrorRow(file) {
    const row = tbody.insertRow();
    row.style.color = '#ff8a8a';
    row.innerHTML = `<td>${truncateName(file.name)}</td><td colspan="4">Ошибка: не удалось прочитать файл</td>`;
}

function truncateName(name) {
    if (name.length > 40) return `${name.substring(0, 20)}...${name.substring(name.length - 15)}`;
    return name;
}

