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
  confirmBtn.className = 'delete-btn';
  confirmBtn.textContent = 'Confirm';
  confirmBtn.dataset.index = index;
  confirmBtn.style.marginLeft = '15px';
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
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Delete';
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
