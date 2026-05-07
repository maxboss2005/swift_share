// ============================================================

//  SUPABASE CONFIGURATION – Replace with your own credentials

// ============================================================

const SUPABASE_URL = 'https://hbdounuknyykmkwcrdqq.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZG91bnVrbnl5a21rd2NyZHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjM4MjksImV4cCI6MjA5MzQ5OTgyOX0.0VfV1iw3cpC4Tkprm5xN56OUAyj-3-_yM2aKiPafNuQ';



// Initialize Supabase client

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



// ============================================================

//  DOM ELEMENTS

// ============================================================

const uploadZone = document.getElementById('uploadZone');

const fileInput = document.getElementById('fileInput');

const browseBtn = document.getElementById('browseBtn');

const uploadProgress = document.getElementById('uploadProgress');

const progressFilename = document.getElementById('progressFilename');

const progressStatus = document.getElementById('progressStatus');

const progressPercentage = document.getElementById('progressPercentage');

const progressBarFill = document.getElementById('progressBarFill');



const fileGrid = document.getElementById('fileGrid');

const loadingState = document.getElementById('loadingState');

const emptyState = document.getElementById('emptyState');

const errorState = document.getElementById('errorState');

const errorMessage = document.getElementById('errorMessage');

const searchInput = document.getElementById('searchInput');

const sortSelect = document.getElementById('sortSelect');

const refreshBtn = document.getElementById('refreshBtn');



const previewModal = document.getElementById('previewModal');

const previewBody = document.getElementById('previewBody');

const closePreview = document.getElementById('closePreview');

const closePreviewBtn = document.getElementById('closePreviewBtn');

const downloadPreviewBtn = document.getElementById('downloadPreviewBtn');

const toastContainer = document.getElementById('toastContainer');



let allFiles = [];

let currentPreviewFile = null;



// ============================================================

//  UTILITY FUNCTIONS

// ============================================================

function formatBytes(bytes) {

  if (bytes === 0) return '0 Bytes';

  const k = 1024;

  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

}



function formatDate(dateString) {

  return new Date(dateString).toLocaleDateString('en-US', {

    month: 'short',

    day: 'numeric',

    year: 'numeric',

    hour: '2-digit',

    minute: '2-digit'

  });

}



function showToast(message, type = 'success') {

  const toast = document.createElement('div');

  toast.className = `toast ${type}`;

  toast.innerHTML = `<i class="ph ${type === 'success' ? 'ph-check-circle' : 'ph-x-circle'}"></i> ${message}`;

  toastContainer.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);

}



function getFileIcon(fileName) {

  const ext = fileName.split('.').pop().toLowerCase();

  const icons = {

    pdf: 'ph-file-pdf',

    jpg: 'ph-file-image',

    jpeg: 'ph-file-image',

    png: 'ph-file-image',

    gif: 'ph-file-image',

    webp: 'ph-file-image',

    svg: 'ph-file-image',

    mp4: 'ph-file-video',

    webm: 'ph-file-video',

    mov: 'ph-file-video',

    mp3: 'ph-file-audio',

    wav: 'ph-file-audio',

    zip: 'ph-file-archive',

    rar: 'ph-file-archive',

    '7z': 'ph-file-archive',

    txt: 'ph-file-text',

    doc: 'ph-file-doc',

    docx: 'ph-file-doc',

    xls: 'ph-file-xls',

    xlsx: 'ph-file-xls',

    ppt: 'ph-file-ppt',

    pptx: 'ph-file-ppt',

  };

  return icons[ext] || 'ph-file';

}



// ============================================================

//  FILE UPLOAD HANDLERS

// ============================================================

uploadZone.addEventListener('click', () => fileInput.click());

browseBtn.addEventListener('click', (e) => {

  e.stopPropagation();

  fileInput.click();

});



// Drag and drop

uploadZone.addEventListener('dragover', (e) => {

  e.preventDefault();

  uploadZone.classList.add('drag-active');

});



uploadZone.addEventListener('dragleave', () => {

  uploadZone.classList.remove('drag-active');

});



uploadZone.addEventListener('drop', (e) => {

  e.preventDefault();

  uploadZone.classList.remove('drag-active');

  const files = Array.from(e.dataTransfer.files);

  if (files.length > 0) handleFiles(files);

});



fileInput.addEventListener('change', () => {

  const files = Array.from(fileInput.files);

  if (files.length > 0) handleFiles(files);

  fileInput.value = '';

});



async function handleFiles(files) {

  for (const file of files) {

    if (file.size > 50 * 1024 * 1024) {

      showToast(`${file.name} exceeds 50MB limit`, 'error');

      continue;

    }

    await uploadFile(file);

  }

  loadFiles();

}



async function uploadFile(file) {

  const filePath = `public/${Date.now()}_${file.name}`;

  

  // Show progress UI

  uploadProgress.style.display = 'block';

  progressFilename.textContent = file.name;

  progressStatus.textContent = 'Uploading...';

  progressPercentage.textContent = '0%';

  progressBarFill.style.width = '0%';



  try {

    const { data, error } = await supabase.storage

      .from('files')

      .upload(filePath, file, {

        cacheControl: '3600',

        upsert: false,

      });



    if (error) throw error;



    // Insert metadata into 'files' table

    const { error: dbError } = await supabase

      .from('files')

      .insert([

        {

          name: file.name,

          file_path: filePath,

          size: file.size,

          mime_type: file.type,

        },

      ]);



    if (dbError) throw dbError;



    progressStatus.textContent = 'Complete!';

    progressPercentage.textContent = '100%';

    progressBarFill.style.width = '100%';

    showToast(`${file.name} uploaded successfully`);



  } catch (err) {

    progressStatus.textContent = 'Failed';

    showToast(`Upload failed: ${err.message}`, 'error');

    console.error('Upload error:', err);

  } finally {

    setTimeout(() => {

      uploadProgress.style.display = 'none';

    }, 2000);

  }

}



// ============================================================

//  LOAD & DISPLAY FILES

// ============================================================

async function loadFiles() {

  fileGrid.innerHTML = '';

  loadingState.style.display = 'block';

  emptyState.style.display = 'none';

  errorState.style.display = 'none';



  try {

    const { data, error } = await supabase

      .from('files')

      .select('*')

      .order('created_at', { ascending: false });



    if (error) throw error;



    allFiles = data || [];

    loadingState.style.display = 'none';



    if (allFiles.length === 0) {

      emptyState.style.display = 'block';

      fileGrid.innerHTML = '';

    } else {

      renderFiles(allFiles);

    }

  } catch (err) {

    loadingState.style.display = 'none';

    errorState.style.display = 'block';

    errorMessage.textContent = err.message || 'Could not load files';

    console.error('Load error:', err);

  }

}



function renderFiles(files) {

  fileGrid.innerHTML = '';

  

  if (files.length === 0) {

    emptyState.style.display = 'block';

    return;

  }

  emptyState.style.display = 'none';



  files.forEach(file => {

    const card = document.createElement('div');

    card.className = 'file-card';

    

    const publicUrl = supabase.storage.from('files').getPublicUrl(file.file_path).data.publicUrl;

    

    card.innerHTML = `

      <div class="card-header">

        <i class="ph ${getFileIcon(file.name)} file-icon"></i>

        <div class="file-info">

          <div class="file-name" title="${file.name}">${file.name}</div>

          <div class="file-meta">${formatBytes(file.size)} • ${formatDate(file.created_at)}</div>

          <div class="file-meta" style="margin-top:2px">Downloads: ${file.download_count || 0}</div>

        </div>

      </div>

      <div class="card-actions">

        <button class="action-btn copy-btn" data-url="${publicUrl}">

          <i class="ph ph-link"></i> Copy Link

        </button>

        <button class="action-btn download-btn" data-url="${publicUrl}" data-name="${file.name}">

          <i class="ph ph-download-simple"></i> Open

        </button>

        <button class="action-btn danger delete-btn" data-id="${file.id}" data-path="${file.file_path}">

          <i class="ph ph-trash"></i>

        </button>

      </div>

    `;



    // Attach event listeners

    card.querySelector('.copy-btn').addEventListener('click', (e) => {

      e.stopPropagation();

      copyToClipboard(publicUrl);

    });



    card.querySelector('.download-btn').addEventListener('click', (e) => {

      e.stopPropagation();

      openPreview(file, publicUrl);

    });



    card.querySelector('.delete-btn').addEventListener('click', (e) => {

      e.stopPropagation();

      deleteFile(file.id, file.file_path);

    });



    // Click card to preview

    card.addEventListener('click', () => openPreview(file, publicUrl));



    fileGrid.appendChild(card);

  });

}



// ============================================================

//  SEARCH & SORT

// ============================================================

function filterAndSortFiles() {

  let filtered = [...allFiles];

  const query = searchInput.value.toLowerCase().trim();

  

  if (query) {

    filtered = filtered.filter(f => f.name.toLowerCase().includes(query));

  }



  const sort = sortSelect.value;

  switch (sort) {

    case 'oldest':

      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      break;

    case 'name-asc':

      filtered.sort((a, b) => a.name.localeCompare(b.name));

      break;

    case 'name-desc':

      filtered.sort((a, b) => b.name.localeCompare(a.name));

      break;

    case 'size-desc':

      filtered.sort((a, b) => b.size - a.size);

      break;

    case 'size-asc':

      filtered.sort((a, b) => a.size - b.size);

      break;

    default: // newest

      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  }



  renderFiles(filtered);

}



searchInput.addEventListener('input', filterAndSortFiles);

sortSelect.addEventListener('change', filterAndSortFiles);

refreshBtn.addEventListener('click', loadFiles);



// ============================================================

//  PREVIEW & DOWNLOAD

// ============================================================

function openPreview(file, url) {

  currentPreviewFile = file;

  previewBody.innerHTML = '';



  const mime = file.mime_type || '';

  if (mime.startsWith('image/')) {

    previewBody.innerHTML = `<img src="${url}" alt="${file.name}">`;

  } else if (mime.startsWith('video/')) {

    previewBody.innerHTML = `<video controls src="${url}"></video>`;

  } else if (mime.startsWith('audio/')) {

    previewBody.innerHTML = `<audio controls src="${url}"></audio>`;

  } else if (mime === 'application/pdf') {

    previewBody.innerHTML = `<iframe src="${url}" width="100%" height="500px" frameborder="0"></iframe>`;

  } else {

    previewBody.innerHTML = `

      <div style="text-align:center">

        <i class="ph ${getFileIcon(file.name)}" style="font-size:4rem; color: var(--color-primary)"></i>

        <p style="margin-top:12px">Preview not available for this file type</p>

      </div>`;

  }



  previewModal.style.display = 'flex';

}



function closePreviewModal() {

  previewModal.style.display = 'none';

  currentPreviewFile = null;

}



closePreview.addEventListener('click', closePreviewModal);

closePreviewBtn.addEventListener('click', closePreviewModal);

previewModal.addEventListener('click', (e) => {

  if (e.target === previewModal) closePreviewModal();

});



downloadPreviewBtn.addEventListener('click', () => {

  if (currentPreviewFile) {

    const url = supabase.storage.from('files').getPublicUrl(currentPreviewFile.file_path).data.publicUrl;

    window.open(url, '_blank');

  }

});



// ============================================================

//  DELETE & COPY

// ============================================================

async function deleteFile(fileId, filePath) {

  if (!confirm('Are you sure you want to delete this file?')) return;



  try {

    // Remove from storage

    const { error: storageError } = await supabase.storage

      .from('files')

      .remove([filePath]);



    if (storageError) throw storageError;



    // Remove from database

    const { error: dbError } = await supabase

      .from('files')

      .delete()

      .eq('id', fileId);



    if (dbError) throw dbError;



    showToast('File deleted');

    loadFiles();

  } catch (err) {

    showToast(`Delete failed: ${err.message}`, 'error');

  }

}



async function copyToClipboard(text) {

  try {

    await navigator.clipboard.writeText(text);

    showToast('Link copied to clipboard');

  } catch {

    showToast('Failed to copy', 'error');

  }

}



// ============================================================

//  INITIAL LOAD

// ============================================================

loadFiles();

  
