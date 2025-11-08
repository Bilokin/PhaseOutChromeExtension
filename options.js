// Always register the required scripts for all websites
async function registerScripts() {
  try {
    // Unregister any existing scripts to avoid duplicates
    const existingScripts = await chrome.userScripts.getScripts();
    if (existingScripts.length > 0) {
      await chrome.userScripts.unregister(existingScripts.map(s => s.id));
    }

    // Register face-api.min.js and user_script.js for all websites

    console.log('Scripts registered successfully.');
  } catch (error) {
    console.error('Failed to register scripts:', error);
  }
}

// Check if userScripts API is available
function isUserScriptsAvailable() {
  try {
    chrome.userScripts;
    return true;
  } catch {
    document.getElementById('warning').style.display = 'block';
    return false;
  }
}

// Initialize the extension
async function init() {
  if (!isUserScriptsAvailable()) return;
  await registerScripts();
  loadSampleImages();
}

// Load and display sample images from storage
async function loadSampleImages() {
  try {
    const result = await chrome.storage.local.get(['sampleImages']);
    const imageList = document.getElementById('imageList');
    const emptyState = document.getElementById('emptyState');
    
    if (result.sampleImages && result.sampleImages.length > 0) {
      // Clear the list and show images
      imageList.innerHTML = '';
      
      result.sampleImages.forEach((image, index) => {
        const imageItem = createImageItem(image, index);
        imageList.appendChild(imageItem);
      });
      
      emptyState.style.display = 'none';
    } else {
      // Show empty state
      imageList.innerHTML = '<div class="empty-state" id="emptyState">No sample images found. Add your first image using the button below.</div>';
      emptyState.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading sample images:', error);
  }
}

// Create a DOM element for an image item
function createImageItem(image, index) {
  const imageItem = document.createElement('div');
  imageItem.className = 'image-item';
  imageItem.dataset.index = index;
  
  // Create preview image element
  const imgPreview = document.createElement('img');
  imgPreview.className = 'image-preview';
  
  // Handle different image storage formats

  // Always use binary data to create a new Blob URL
  if (image.data && image.data.length > 0) {
    const blob = new Blob([new Uint8Array(image.data)], { type: 'image/jpeg' });
    imgPreview.src = URL.createObjectURL(blob);
  } else if (image.imageUrl) {
    imgPreview.src = image.imageUrl;
  } else {
    // Fallback to a placeholder or default image
    imgPreview.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect fill="%23eee" width="80" height="80"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
  }
  
  imgPreview.alt = image.name || `Image ${index + 1}`;
  
  // Create info container
  const imageInfo = document.createElement('div');
  imageInfo.className = 'image-info';
  
  // Create name input field
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'person-name';
  nameInput.placeholder = 'Person name';
  nameInput.value = image.name || '';
  nameInput.dataset.index = index;
  nameInput.disabled = !!image.name; // Disable if already has a name
  
  // Add event listener to save name when changed
  nameInput.addEventListener('change', function() {
    saveImageName(index, this.value);
  });
  
  // Create confirmation button (only for images without names)
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'control-btn';
  confirmBtn.innerHTML = `
  <svg fill="#ffffffff" height="15px" width="15px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 492 492" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path d="M484.128,104.478l-16.116-16.116c-5.064-5.068-11.816-7.856-19.024-7.856c-7.208,0-13.964,2.788-19.028,7.856 L203.508,314.81L62.024,173.322c-5.064-5.06-11.82-7.852-19.028-7.852c-7.204,0-13.956,2.792-19.024,7.852l-16.12,16.112 C2.784,194.51,0,201.27,0,208.47c0,7.204,2.784,13.96,7.852,19.028l159.744,159.736c0.212,0.3,0.436,0.58,0.696,0.836 l16.12,15.852c5.064,5.048,11.82,7.572,19.084,7.572h0.084c7.212,0,13.968-2.524,19.024-7.572l16.124-15.992 c0.26-0.256,0.48-0.468,0.612-0.684l244.784-244.76C494.624,132.01,494.624,114.966,484.128,104.478z"></path> </g> </g> </g></svg>
  `;
  confirmBtn.dataset.index = index;
  confirmBtn.style.backgroundColor = '#4CAF50';
  
  // Only show confirmation button if image doesn't have a name yet
  if (image.name) {
    confirmBtn.style.display = 'none';
  }
  
  confirmBtn.addEventListener('click', function() {
    const name = nameInput.value.trim();
    if (name && validatePersonName(name)) {
      finalizeImageUpload(index, name);
    } else {
      alert('Please enter a valid person name (less than 15 characters, no special characters except "-()\'")');
    }
  });
  
  // Create delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'control-btn';
  deleteBtn.innerHTML = `
  <svg height="15px" width="15px" viewBox="0 -0.5 21 21" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#ffffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>delete [#1487]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-179.000000, -360.000000)" fill="#ffffffff"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M130.35,216 L132.45,216 L132.45,208 L130.35,208 L130.35,216 Z M134.55,216 L136.65,216 L136.65,208 L134.55,208 L134.55,216 Z M128.25,218 L138.75,218 L138.75,206 L128.25,206 L128.25,218 Z M130.35,204 L136.65,204 L136.65,202 L130.35,202 L130.35,204 Z M138.75,204 L138.75,200 L128.25,200 L128.25,204 L123,204 L123,206 L126.15,206 L126.15,220 L140.85,220 L140.85,206 L144,206 L144,204 L138.75,204 Z" id="delete-[#1487]"> </path> </g> </g> </g> </g></svg>
  `;
  deleteBtn.dataset.index = index;
  
  deleteBtn.addEventListener('click', function() {
    deleteSampleImage(index);
  });
  
  // Add validation error message element
  const errorMsg = document.createElement('div');
  errorMsg.className = 'name-validation-error';
  errorMsg.style.display = 'none';
  
  // Assemble the image info section
  imageInfo.appendChild(nameInput);
  imageInfo.appendChild(confirmBtn);
  imageInfo.appendChild(errorMsg);
  imageInfo.appendChild(deleteBtn);
  
  imageItem.appendChild(imgPreview);
  imageItem.appendChild(imageInfo);
  
  return imageItem;
}

// Save the person name for an image
async function saveImageName(index, name) {
  try {
    const result = await chrome.storage.local.get(['sampleImages']);
    if (result.sampleImages && result.sampleImages[index]) {
      result.sampleImages[index].name = name;
      await chrome.storage.local.set({ sampleImages: result.sampleImages });
    }
  } catch (error) {
    console.error('Error saving image name:', error);
  }
}

// Delete a sample image
async function deleteSampleImage(index) {
  try {
    const result = await chrome.storage.local.get(['sampleImages']);
    if (result.sampleImages && result.sampleImages[index]) {
      // Remove the image from storage
      result.sampleImages.splice(index, 1);
      await chrome.storage.local.set({ sampleImages: result.sampleImages });
      
      // Reload the list
      loadSampleImages();
    }
  } catch (error) {
    console.error('Error deleting sample image:', error);
  }
}

// Handle file upload
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.match('image.*')) {
    alert('Please select an image file (JPEG, PNG)');
    return;
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('File size exceeds 5MB limit');
    return;
  }
  
  try {
    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Read file as ArrayBuffer for storage
    const arrayBuffer = await file.arrayBuffer();
    
    // Create image object with data and preview URL
    const imageObject = {
      name: '', // Will be set later by user
      imageUrl: file.name,
      previewUrl: previewUrl,
      data: Array.from(new Uint8Array(arrayBuffer))
    };
    
    // Load existing images and add new one
    const result = await chrome.storage.local.get(['sampleImages']);
    const sampleImages = result.sampleImages || [];
    sampleImages.push(imageObject);
    
    // Save to storage
    await chrome.storage.local.set({ sampleImages: sampleImages });
    
    // Reload the list to show the new image
    loadSampleImages();
    
    // Reset file input
    event.target.value = '';
  } catch (error) {
    console.error('Error uploading image:', error);
    alert('Failed to upload image');
  }
}

// Validate person name
function validatePersonName(name) {
  if (!name || name.length >= 15) return false;
  const regex = /^[a-zA-Z0-9\s\-()']+$/;
  return regex.test(name);
}

// Finalize image upload with person name
async function finalizeImageUpload(index, name) {
  // Validate the name
  if (!validatePersonName(name)) {
    alert('Please enter a valid person name (less than 15 characters, no special characters except "-()\'")');
    return false;
  }
  
  try {
    const result = await chrome.storage.local.get(['sampleImages']);
    if (result.sampleImages && result.sampleImages[index]) {
      // Set the name
      result.sampleImages[index].name = name;
      
      // Save to storage
      await chrome.storage.local.set({ sampleImages: result.sampleImages });
      
      // Reload the list
      loadSampleImages();
      
      return true;
    }
  } catch (error) {
    console.error('Error finalizing image upload:', error);
    alert('Failed to finalize image upload');
    return false;
  }
  
  return false;
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  if (!isUserScriptsAvailable()) return;
  
  // Set up file input handler
  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', handleFileUpload);
  
  // Set up add image button
  const addImageBtn = document.getElementById('addImageBtn');
  addImageBtn.addEventListener('click', function() {
    fileInput.click();
  });
  
  await init();
});
