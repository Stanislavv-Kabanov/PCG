document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const processButton = document.getElementById('processButton');
    const processingTypeSelect = document.getElementById('processing_type');
    const originalCanvas = document.getElementById('originalCanvas');
    const processedCanvas = document.getElementById('processedCanvas');
    const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
    const processedCtx = processedCanvas.getContext('2d');
    const loader = document.getElementById('loader');

    const kParam = document.getElementById('k_param');
    const alphaParam = document.getElementById('alpha_param');
    const thresholdParam = document.getElementById('threshold_value');
    const kValueSpan = document.getElementById('k_value');
    const alphaValueSpan = document.getElementById('alpha_value');
    const thresholdDisplaySpan = document.getElementById('threshold_display');

    let originalImageData = null;

    // Обновление отображаемых значений для ползунков
    kParam.addEventListener('input', () => kValueSpan.textContent = kParam.value);
    alphaParam.addEventListener('input', () => alphaValueSpan.textContent = alphaParam.value);
    thresholdParam.addEventListener('input', () => thresholdDisplaySpan.textContent = thresholdParam.value);

    // Скрытие/отображение блоков с параметрами в зависимости от выбранного метода
    processingTypeSelect.addEventListener('change', () => {
        document.querySelectorAll('.params-block').forEach(block => block.style.display = 'none');
        const selectedBlock = document.getElementById(`params-${processingTypeSelect.value}`);
        if (selectedBlock) {
            selectedBlock.style.display = 'block';
        }
    });

    // Загрузка и отображение выбранного изображения
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                originalCanvas.width = img.width;
                originalCanvas.height = img.height;
                originalCtx.drawImage(img, 0, 0);
                originalImageData = originalCtx.getImageData(0, 0, img.width, img.height);
                processButton.disabled = false;
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Обработка изображения по нажатию кнопки
    processButton.addEventListener('click', () => {
        if (!originalImageData) return;

        loader.style.display = 'block';
        processedCanvas.style.display = 'none';

        // setTimeout для того, чтобы браузер успел показать индикатор загрузки
        setTimeout(() => {
            const selectedMethod = processingTypeSelect.value;
            let resultImageData;
            const grayImageData = getGrayscaleImageData(originalImageData);

            switch (selectedMethod) {
                /*
                 * РЕАЛИЗАЦИЯ ВЫСОКОЧАСТОТНЫХ ФИЛЬТРОВ (УВЕЛИЧЕНИЕ РЕЗКОСТИ)
                 */
                case 'sharpen':
                    // Применяем простой фильтр резкости.
                    // Это делается с помощью операции свертки с ядром (матрицей),
                    // которое увеличивает разницу в яркости между центральным пикселем и его соседями.
                    // Ядро [[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]] вычитает соседние пиксели
                    // из центрального, который умножен на 9, тем самым подчеркивая детали.
                    resultImageData = applyConvolution(originalImageData, [[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]]);
                    break;
                case 'laplacian':
                    // Фильтр Лапласа - это другой метод увеличения резкости.
                    // 1. Сначала применяется оператор Лапласа (свертка с ядром [[0, 1, 0], [1, -4, 1], [0, 1, 0]])
                    //    к изображению в оттенках серого. Этот оператор находит участки с резким изменением яркости (границы).
                    const laplacianResult = applyConvolution(grayImageData, [[0, 1, 0], [1, -4, 1], [0, 1, 0]]);
                    // 2. Результат работы оператора Лапласа вычитается из оригинального цветного изображения,
                    //    чтобы усилить найденные границы и сделать изображение более резким.
                    resultImageData = subtractImageData(originalImageData, laplacianResult);
                    break;

                /*
                 * РЕАЛИЗАЦИЯ ГЛОБАЛЬНОЙ И АДАПТИВНОЙ ОБРАБОТКИ
                 */
                case 'global_manual':
                    resultImageData = applyGlobalThreshold(grayImageData, parseInt(thresholdParam.value));
                    break;
                case 'global_otsu':
                    resultImageData = applyOtsuThreshold(grayImageData);
                    break;
                case 'adaptive_lecture':
                    resultImageData = lectureAdaptiveThreshold(grayImageData, parseInt(kParam.value), parseFloat(alphaParam.value));
                    break;
            }
            
            // Отображение результата
            processedCanvas.width = resultImageData.width;
            processedCanvas.height = resultImageData.height;
            processedCtx.putImageData(resultImageData, 0, 0);
            
            loader.style.display = 'none';
            processedCanvas.style.display = 'block';
        }, 10);
    });


    function getGrayscaleImageData(sourceImageData) {
        const { data, width, height } = sourceImageData;
        const newImageData = new ImageData(width, height);
        const newData = newImageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            newData[i] = newData[i + 1] = newData[i + 2] = gray;
            newData[i + 3] = 255;
        }
        return newImageData;
    }

    function applyConvolution(sourceImageData, kernel) {
        const { data, width, height } = sourceImageData;
        const newImageData = new ImageData(width, height);
        const newData = newImageData.data;
        const kSize = kernel.length;
        const kRadius = Math.floor(kSize / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0;
                for (let ky = 0; ky < kSize; ky++) {
                    for (let kx = 0; kx < kSize; kx++) {
                        const px = x + kx - kRadius;
                        const py = y + ky - kRadius;
                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const i = (py * width + px) * 4;
                            const weight = kernel[ky][kx];
                            r += data[i] * weight;
                            g += data[i + 1] * weight;
                            b += data[i + 2] * weight;
                        }
                    }
                }
                const outIndex = (y * width + x) * 4;
                newData[outIndex] = Math.max(0, Math.min(255, r));
                newData[outIndex + 1] = Math.max(0, Math.min(255, g));
                newData[outIndex + 2] = Math.max(0, Math.min(255, b));
                newData[outIndex + 3] = 255;
            }
        }
        return newImageData;
    }

    function subtractImageData(imgData1, imgData2) {
        const { data: d1, width, height } = imgData1;
        const { data: d2 } = imgData2;
        const newImageData = new ImageData(width, height);
        const newData = newImageData.data;
        for (let i = 0; i < d1.length; i+=4) {
            newData[i] = Math.max(0, Math.min(255, d1[i] - d2[i]));
            newData[i+1] = Math.max(0, Math.min(255, d1[i+1] - d2[i+1]));
            newData[i+2] = Math.max(0, Math.min(255, d1[i+2] - d2[i+2]));
            newData[i+3] = 255;
        }
        return newImageData;
    }
    
    function applyGlobalThreshold(grayImageData, threshold) {
        const { data, width, height } = grayImageData;
        const newImageData = new ImageData(width, height);
        const newData = newImageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const val = data[i] > threshold ? 255 : 0;
            newData[i] = newData[i + 1] = newData[i + 2] = val;
            newData[i + 3] = 255;
        }
        return newImageData;
    }
    
    function applyOtsuThreshold(grayImageData) {
        const { data, width, height } = grayImageData;
        const totalPixels = width * height;
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            histogram[data[i]]++;
        }

        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }

        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let maxVar = 0;
        let threshold = 0;

        for (let t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB === 0) continue;
            wF = totalPixels - wB;
            if (wF === 0) break;
            sumB += t * histogram[t];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            const betweenVar = wB * wF * (mB - mF) ** 2;
            if (betweenVar > maxVar) {
                maxVar = betweenVar;
                threshold = t;
            }
        }
        return applyGlobalThreshold(grayImageData, threshold);
    }
    
    function lectureAdaptiveThreshold(grayImageData, K, alpha) {
        const { data, width, height } = grayImageData;
        const newImageData = new ImageData(width, height);
        const newData = newImageData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let f_min = 255, f_max = 0, sum = 0, count = 0;
                
                for (let wy = -K; wy <= K; wy++) {
                    for (let wx = -K; wx <= K; wx++) {
                        const px = x + wx;
                        const py = y + wy;

                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const i = (py * width + px) * 4;
                            const val = data[i];
                            if (val < f_min) f_min = val;
                            if (val > f_max) f_max = val;
                            sum += val;
                            count++;
                        }
                    }
                }
                
                const p_hat = sum / count;
                const delta_f_max = Math.abs(f_max - p_hat);
                const delta_f_min = Math.abs(f_min - p_hat);
                
                let t = 0;
                if (delta_f_max > delta_f_min) {
                    t = alpha * (2/3 * f_min + 1/3 * p_hat);
                } else if (delta_f_max < delta_f_min) {
                    t = alpha * (1/3 * f_min + 2/3 * p_hat);
                } else { 
                    t = alpha * p_hat;
                }

                const currentIndex = (y * width + x) * 4;
                const originalVal = data[currentIndex];
                const finalVal = originalVal > t ? 255 : 0;
                
                newData[currentIndex] = newData[currentIndex + 1] = newData[currentIndex + 2] = finalVal;
                newData[currentIndex + 3] = 255;
            }
        }
        return newImageData;
    }
});