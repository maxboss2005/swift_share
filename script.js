/* ===== Supabase Configuration ===== */

// TODO: Replace with your own Supabase project URL and anon key.

// You can find them in: Supabase Dashboard → Project Settings → API.

const SUPABASE_URL = 'https://hbdounuknyykmkwcrdqq.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZG91bnVrbnl5a21rd2NyZHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjM4MjksImV4cCI6MjA5MzQ5OTgyOX0.0VfV1iw3cpC4Tkprm5xN56OUAyj-3-_yM2aKiPafNuQ';



// Initialize the Supabase client

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



/* ===== DOM Elements ===== */

const authSection = document.getElementById('auth-section');

const mainSection = document.getElementById('main-section');

const authForm = document.getElementById('auth-form');

const emailInput = document.getElementById('email');

const passwordInput = document.getElementById('password');

const authError = document.getElementById('auth-error');

const loginTab = document.getElementById('login-tab');

const signupTab = document.getElementById('signup-tab');

const userEmailSpan = document.getElementById('user-email');

const logoutBtn = document.getElementById('logout-btn');

const dropZone = document.getElementById('drop-zone');

const fileInput = document.getElementById('file-input');

const browseBtn = document.getElementById('browse-btn');

const progressContainer = document.getElementById('progress-container');

const progressBar = document.getElementById('progress-bar');

const uploadMessage = document.getElementById('upload-message');

const searchInput = document.getElementById('search-input');

const filesList = document.getElementById('files-list');

const emptyState = document.getElementById('empty-state');



// Auth mode state

let authMode = 'login'; // 'login' or 'signup'



/* ===== Authentication Logic ===== */



// Toggle between login and signup tabs

loginTab.addEventListener('click', () => {

  authMode = 'login';

  loginTab.classList.add('active');

  signupTab.classList.remove('active');

});



signupTab.addEventListener('click', () => {

  authMode = 'signup';

  signupTab.classList.add('active');

  loginTab.classList.remove('active');

});



// Handle login/signup form submission

authForm.addEventListener('submit', async (e) => {

  e.preventDefault();

  authError.textContent = '';

  const email = emailInput.value.trim();

  const password = passwordInput.value;



  let response;

  if (authMode === 'signup') {

    // signUp returns { data, error }

    response = await supabase.auth.signUp({ email, password });

  } else {

    response = await supabase.auth.signInWithPassword({ email, password });

  }



  if (response.error) {

    authError.textContent = response.error.message;

  } else {

    // On successful sign up, user might need to confirm email (depending on settings).

    // We check if a user object was returned. If not, show a hint.

    if (authMode === 'signup' && response.data.user?.identities?.length === 0) {

      authError.textContent = 'Sign up successful! Please check your email for confirmation.';

    }

    // Session will be automatically updated by onAuthStateChange, which shows the main app.

  }

});



// Listen to auth state changes

supabase.auth.onAuthStateChange((event, session) => {

  if (session?.user) {

    // User is logged in

    authSection.classList.add('hidden');

    mainSection.classList.remove('hidden');

    userEmailSpan.textContent = session.user.email;

    loadFiles();

  } else {

    // User logged out

    authSection.classList.remove('hidden');

    mainSection.classList.add('hidden');

    userEmailSpan.textContent = '';

  }

});



// Logout

logoutBtn.addEventListener('click', async () => {

  await supabase.auth.signOut();

});



/* ===== File Handling ===== */



// Browse files via button

browseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {

  handleFiles(e.target.files);

});



// Drag & drop setup

dropZone.addEventListener('dragover', (e) => {

  e.preventDefault();

  dropZone.classList.add('dragover');

});



dropZone.addEventListener('dragleave', () => {

  dropZone.classList.remove('dragover');

});



dropZone.addEventListener('drop', (e) => {

  e.preventDefault();

  dropZone.classList.remove('dragover');

  const dt = e.dataTransfer;

  if (dt.files.length) {

    handleFiles(dt.files);

  }

});



// Process selected / dropped files

async function handleFiles(files) {

  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {

    alert('You must be logged in to upload files.');

    return;

  }

  uploadMessage.textContent = '';

  for (const file of files) {

    await uploadFile(file, user);

  }

  fileInput.value = ''; // reset file input

}



// Upload one file with progress reporting

async function uploadFile(file, user) {

  const userId = user.id;

  // Create a unique path inside the user's folder (add timestamp to avoid collisions)

  const timestamp = Date.now();

  const filePath = `${userId}/${timestamp}_${file.name}`;



  // Step 1: Get a signed upload URL from Supabase Storage

  const { data, error } = await supabase.storage

    .from('user-files')

    .createSignedUploadUrl(filePath);



  if (error) {

    uploadMessage.textContent = `Upload failed: ${error.message}`;

    return;

  }



  const signedUrl = data.signedUrl;



  // Step 2: Upload the file using XMLHttpRequest to track progress

  try {

    await new Promise((resolve, reject) => {

      const xhr = new XMLHttpRequest();

      xhr.open('PUT', signedUrl);



      // Progress event

      xhr.upload.addEventListener('progress', (e) => {

        if (e.lengthComputable) {

          const percent = Math.round((e.loaded / e.total) * 100);

          progressContainer.classList.remove('hidden');

          progressBar.style.width = percent + '%';

          uploadMessage.textContent = `Uploading ${file.name}: ${percent}%`;

        }

      });



      xhr.addEventListener('load', () => {

        if (xhr.status >= 200 && xhr.status < 300) {

          resolve();

        } else {

          reject(new Error(`Upload failed with status ${xhr.status}`));

        }

      });



      xhr.addEventListener('error', () => reject(new Error('Network error')));

      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));



      // Set the content type (optional, but good practice)

      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.send(file);

    });



    // After successful upload, save metadata to the database

    const { error: insertError } = await supabase.from('files').insert({

      user_id: userId,

      file_name: file.name,

      file_size: file.size,

      file_path: filePath

    });



    if (insertError) {

      uploadMessage.textContent = `Metadata save error: ${insertError.message}`;

    } else {

      uploadMessage.textContent = `✅ ${file.name} uploaded successfully!`;

    }

  } catch (err) {

    uploadMessage.textContent = `Upload error: ${err.message}`;

  } finally {

    // Reset progress bar after a short delay

    setTimeout(() => {

      progressContainer.classList.add('hidden');

      progressBar.style.width = '0%';

    }, 2000);

  }



  // Refresh the file list

  loadFiles();

}



// Load and display files for the current user

async function loadFiles() {

  const user = (await supabase.auth.getUser()).data.user;

  if (!user) return;



  const { data: files, error } = await supabase

    .from('files')

    .select('*')

    .eq('user_id', user.id)

    .order('upload_date', { ascending: false });



  if (error) {

    console.error('Error loading files:', error);

    return;

  }



  renderFileList(files || []);

}



// Render file cards

function renderFileList(files) {

  const searchTerm = searchInput.value.toLowerCase();



  const filtered = files.filter((f) =>

    f.file_name.toLowerCase().includes(searchTerm)

  );



  filesList.innerHTML = ''; // clear current list



  if (filtered.length === 0) {

    const emptyMsg = document.createElement('p');

    emptyMsg.id = 'empty-state';

    emptyMsg.textContent = searchTerm ? 'No files match your search.' : 'No files uploaded yet.';

    filesList.appendChild(emptyMsg);

    return;

  }



  filtered.forEach((file) => {

    const fileDiv = document.createElement('div');

    fileDiv.className = 'file-item';



    // File icon based on extension

    const ext = file.file_name.split('.').pop().toLowerCase();

    const icon = getFileIcon(ext);



    // Format file size

    const sizeText = formatBytes(file.file_size);

    const dateText = new Date(file.upload_date).toLocaleString();



    fileDiv.innerHTML = `

      <div class="file-icon">${icon}</div>

      <div class="file-info">

        <div class="file-name" title="${file.file_name}">${file.file_name}</div>

        <div class="file-meta">

          <span>${sizeText}</span>

          <span>${dateText}</span>

        </div>

      </div>

      <div class="file-actions">

        <button class="btn-download" data-path="${file.file_path}">⬇ Download</button>

        <button class="btn-share" data-path="${file.file_path}">🔗 Share</button>

        <button class="btn-del" data-id="${file.id}" data-path="${file.file_path}">🗑 Delete</button>

      </div>

    `;



    // Event listeners

    const downloadBtn = fileDiv.querySelector('.btn-download');

    const shareBtn = fileDiv.querySelector('.btn-share');

    const deleteBtn = fileDiv.querySelector('.btn-del');



    downloadBtn.addEventListener('click', () => downloadFile(file.file_path));

    shareBtn.addEventListener('click', () => shareFile(file.file_path, shareBtn));

    deleteBtn.addEventListener('click', () => deleteFile(file.id, file.file_path));



    filesList.appendChild(fileDiv);

  });

}



// Helper: map file extension to an emoji icon

function getFileIcon(ext) {

  const icons = {

    pdf: '📄',

    jpg: '🖼️',

    jpeg: '🖼️',

    png: '🖼️',

    gif: '🖼️',

    svg: '🖼️',

    webp: '🖼️',

    doc: '📝',

    docx: '📝',

    xls: '📊',

    xlsx: '📊',

    ppt: '📽️',

    pptx: '📽️',

    zip: '📦',

    rar: '📦',

    '7z': '📦',

    mp3: '🎵',

    mp4: '🎬',

    txt: '📃',

    default: '📁'

  };

  return icons[ext] || icons.default;

}



// Format bytes to human-readable string

function formatBytes(bytes, decimals = 2) {

  if (!bytes || bytes === 0) return '0 Bytes';

  const k = 1024;

  const dm = decimals < 0 ? 0 : decimals;

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];

}



// Generate a signed URL for download

async function downloadFile(filePath) {

  const { data, error } = await supabase.storage

    .from('user-files')

    .createSignedUrl(filePath, 3600); // valid for 1 hour



  if (error) {

    alert('Error creating download link: ' + error.message);

    return;

  }

  // Trigger download by opening the signed URL in a new tab or creating a hidden anchor

  console.log('Download link:', data.signedUrl);

  // For simplicity, open the link directly

  window.open(data.signedUrl, '_blank');

}



// Share file: generate a signed URL and let user copy it

async function shareFile(filePath, shareBtn) {

  // Remove any existing input from previous shares

  const existingInput = shareBtn.parentNode.querySelector('.share-link-input');

  if (existingInput) {

    existingInput.remove();

    return;

  }



  const { data, error } = await supabase.storage

    .from('user-files')

    .createSignedUrl(filePath, 86400); // valid for 24 hours (adjust as needed)



  if (error) {

    alert('Error creating share link: ' + error.message);

    return;

  }



  const input = document.createElement('input');

  input.type = 'text';

  input.className = 'share-link-input';

  input.value = data.signedUrl;

  input.readOnly = true;

  // Insert after the share button

  shareBtn.parentNode.insertBefore(input, shareBtn.nextSibling);

  input.select();

  navigator.clipboard.writeText(data.signedUrl).then(() => {

    alert('Link copied to clipboard!');

  });

}



// Delete file (storage + database)

async function deleteFile(fileId, filePath) {

  if (!confirm('Are you sure you want to delete this file?')) return;



  // Remove from storage

  const { error: storageError } = await supabase.storage

    .from('user-files')

    .remove([filePath]);



  if (storageError) {

    alert('Error deleting from storage: ' + storageError.message);

    return;

  }



  // Remove from database

  const { error: dbError } = await supabase

    .from('files')

    .delete()

    .eq('id', fileId);



  if (dbError) {

    alert('Error deleting file record: ' + dbError.message);

    return;

  }



  loadFiles(); // refresh list

}



// Search / filter files

searchInput.addEventListener('input', () => {

  loadFiles(); // re-render list with current filter

});



// Check initial session on page load

(async () => {

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {

    authSection.classList.add('hidden');

    mainSection.classList.remove('hidden');

    userEmailSpan.textContent = session.user.email;

    loadFiles();

  }

})();

  
