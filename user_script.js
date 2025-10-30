//alert('Hello World!');

// Function to detect faces in a single image
async function detectFacesInImage(img) {
    if (!img.complete) {
        // Wait for the image to load if it's not already loaded
        await new Promise((resolve) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', () => {
                console.error("Failed to load image:", img.src);
                resolve();
            });
        });
    }
    const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
    console.log(`Detected ${detections.length} faces in image:`, img.src, detections);
}

// Example images: [{ label: 'Person1', imageUrl: 'person1.jpg' }, ...]
const exampleImages = [
    { label: 'Penny', imageUrl: 'person1.jpg' },
    { label: 'Penny', imageUrl: 'person1a.jpg' },
    { label: 'Penny', imageUrl: 'person1b.jpg' },
    { label: 'Sheldon', imageUrl: 'person2.jpg' },
    // Add more examples as needed
];

const labeledDescriptors = [];

async function loadExampleImages(exampleImages) {
    for (const { label, imageUrl } of exampleImages) {
        const img = await faceapi.fetchImage(imageUrl);
        const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
        if (detections) {
            // Check if this label already exists in labeledDescriptors
            const existingEntryIndex = labeledDescriptors.findIndex(entry => entry.label === label);
            if (existingEntryIndex >= 0) {
                // Append the new descriptor to the existing entry
                labeledDescriptors[existingEntryIndex].descriptors.push(detections.descriptor);
            } else {
                // Create a new LabeledFaceDescriptors object
                const labeledFaceDescriptors = new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
                labeledDescriptors.push(labeledFaceDescriptors);
            }
            console.log(`Encoded example for ${label}`);
        } else {
            console.error(`No face detected in example image for ${label}`);
        }
    }
}


// Initialize the face matcher after loading example images
function initFaceMatcher() {
    faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    console.log("Face matcher initialized with examples.");
}

async function resizeImage(img, maxWidth = 640, maxHeight = 480) {
    // Create a temporary canvas to resize the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = img.width;
    let newHeight = img.height;
    if (img.width > maxWidth) {
        newWidth = maxWidth;
        newHeight = (img.height * maxWidth) / img.width;
    }
    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = (img.width * maxHeight) / img.height;
    }

    // Set canvas dimensions
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Draw the resized image
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Return a new image with the resized data
    const resizedImg = new Image();
    resizedImg.src = canvas.toDataURL('image/jpeg');
    await new Promise((resolve) => {
        resizedImg.onload = resolve;
    });
    return resizedImg;
}

function loadCfg() {
    // Configuration parameters
    return {
        minImageSize: 100, // Minimum width/height to process an image
        maxResizeWidth: 640, // Maximum width for resizing images
        maxResizeHeight: 480, // Maximum height for resizing images
        faceMatchThreshold: 0.6, // Threshold for face recognition confidence
        boxAdjustments: {
            x: 5, // X-axis adjustment for the face box
            y: -10, // Y-axis adjustment for the face box
            width: -10, // Width adjustment for the face box
        },
        canvasStyles: {
            border: '1px solid blue', // Debug: Visualize canvas
            zIndex: '1000',
            pointerEvents: 'none',
        },
        boxStyles: {
            strokeStyle: 'red',
            lineWidth: 2,
            fillStyle: 'rgba(255, 0, 0, 0.8)',
        },
        labelStyles: {
            fillStyle: 'white',
            font: '18px Arial',
            maxLength: 10, // Maximum length of the label text
        },
    };
}



async function recognizeFacesInImage(img, cfg) {
    if (!img.complete) {
        await new Promise((resolve) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', () => {
                console.error("Failed to load image:", img.src);
                resolve();
            });
        });
    }

    // Skip small images
    if (img.width < cfg.minImageSize || img.height < cfg.minImageSize) {
        return [];
    }
    // Resize the image before processing
    const resizedImg = await resizeImage(img, cfg.maxResizeWidth, cfg.maxResizeHeight);

    // Detect faces
    const detections = await faceapi.detectAllFaces(resizedImg, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (detections.length > 0) {
        // Recognize faces
        const results = detections.map(d => faceMatcher.findBestMatch(d.descriptor));
        const wrapper = wrapImageInContainer(img);

        // Remove old canvases for this image
        const oldCanvas = wrapper.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();

        // Create a single canvas for this image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions to match the displayed image
        canvas.width = img.width;
        canvas.height = img.height;

        // Position the canvas over the image, accounting for margins/padding
        canvas.style.position = 'absolute';
        const imgRect = img.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        canvas.style.left = (imgRect.left - wrapperRect.left) + 'px';
        canvas.style.top = (imgRect.top - wrapperRect.top) + 'px';

        // Apply canvas styles
        Object.entries(cfg.canvasStyles).forEach(([key, value]) => {
            canvas.style[key] = value;
        });

        // Set a data attribute to identify the canvas
        canvas.setAttribute('data-img-src', img.src);

        // Calculate scaling factors
        const scaleX = img.width / resizedImg.naturalWidth;
        const scaleY = img.height / resizedImg.naturalHeight;

        // Draw all recognized faces on the same canvas
        results.forEach((result, i) => {
            if (result.distance < cfg.faceMatchThreshold) {
                const box = detections[i].detection.box;
                const scaledBox = {
                    x: box.x * scaleX + cfg.boxAdjustments.x,
                    y: box.y * scaleY + cfg.boxAdjustments.y,
                    width: box.width * scaleX + cfg.boxAdjustments.width,
                    height: box.height * scaleY,
                };

                // Draw a semi-transparent rectangle over the recognized face
                ctx.strokeStyle = cfg.boxStyles.strokeStyle;
                ctx.lineWidth = cfg.boxStyles.lineWidth;
                ctx.fillStyle = cfg.boxStyles.fillStyle;
                ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);
                ctx.fillRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);

                // Add the label
                ctx.fillStyle = cfg.labelStyles.fillStyle;
                ctx.font = cfg.labelStyles.font;
                ctx.fillText(
                    result.label.slice(0, cfg.labelStyles.maxLength),
                    scaledBox.x + 5,
                    scaledBox.y + scaledBox.height / 2,
                    scaledBox.width - 10
                );
            }
        });

        // Append the canvas to the wrapper
        wrapper.appendChild(canvas);
        return results;
    } else {
        return [];
    }
}


// Helper function to wrap the image in a container
function wrapImageInContainer(img) {
    // Skip if the image is already wrapped
    if (img.parentElement.classList.contains('face-recognition-wrapper')) {
        return img.parentElement;
    }

    // Create a wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'face-recognition-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block'; // Preserve image layout

    // Insert the wrapper before the image and move the image inside it
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    return wrapper;
}

// Function to detect and recognize faces in all existing images
async function detectFacesInAllImages(cfg) {
    const imgs = document.getElementsByTagName('img');
    for (let img of imgs) {
        await recognizeFacesInImage(img, cfg);
    }
}

// Set up MutationObserver to watch for new images
function setupMutationObserver(cfg) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeName === 'IMG') {
                    recognizeFacesInImage(node, cfg);
                } else if (node.querySelectorAll) {
                    const newImgs = node.querySelectorAll('img');
                    newImgs.forEach((img) => recognizeFacesInImage(img, cfg));
                }
            });
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}


// Load models, examples, and start observing
async function init() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('./weights');
    await faceapi.nets.faceLandmark68Net.loadFromUri('./weights');
    await faceapi.nets.faceRecognitionNet.loadFromUri('./weights');
    console.log("Models loaded!");

    await loadExampleImages(exampleImages);
    cfg = loadCfg()
    initFaceMatcher();

    await detectFacesInAllImages(cfg); // Detect and recognize faces in existing images
    setupMutationObserver(cfg);       // Start observing for new images
}

// Start the process
init().catch(console.error);

