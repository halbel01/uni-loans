document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  
  if (!token || !userId) {
    alert('You must be logged in to upload documents');
    window.location.href = 'login.html';
    return;
  }
  
  // Handle logout
  document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userRole');
    window.location.href = 'login.html';
  });
  
  // Fetch existing documents
  fetchDocuments();
  
  // Handle ID verification form submission
  const idVerificationForm = document.getElementById('idVerificationForm');
  idVerificationForm.addEventListener('submit', function(event) {
    event.preventDefault();
    uploadDocument('identity', 'idDocument', 'idType');
  });
  
  // Handle address verification form submission
  const addressVerificationForm = document.getElementById('addressVerificationForm');
  addressVerificationForm.addEventListener('submit', function(event) {
    event.preventDefault();
    uploadDocument('address', 'addressDocument', 'addressDocType');
  });
  
  // Handle financial document form submission
  const financialDocumentForm = document.getElementById('financialDocumentForm');
  financialDocumentForm.addEventListener('submit', function(event) {
    event.preventDefault();
    uploadDocument('financial', 'financialDocument', 'financialDocType');
  });
  
  // Function to upload a document
  async function uploadDocument(category, fileInputId, typeInputId) {
    const fileInput = document.getElementById(fileInputId);
    const documentType = document.getElementById(typeInputId).value;
    
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Please select a file to upload');
      return;
    }
    
    const file = fileInput.files[0];
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      return;
    }
    
    const formData = new FormData();
    formData.append('document', file);
    formData.append('category', category);
    formData.append('documentType', documentType);
    formData.append('userId', userId);
    
    try {
      const response = await fetch('/user/upload-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Document uploaded successfully!');
        // Reset form
        document.getElementById(fileInputId).value = '';
        document.getElementById(typeInputId).value = '';
        // Refresh document list
        fetchDocuments();
      } else {
        alert(data.message || 'Error uploading document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('An error occurred while uploading the document. Please try again.');
    }
  }
  
  // Function to fetch existing documents
  async function fetchDocuments() {
    try {
      const response = await fetch(`/user/documents/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const documents = await response.json();
        displayUploadedDocuments(documents);
      } else {
        document.getElementById('uploadedDocumentsContainer').innerHTML = `
          <p class="text-center">Failed to load documents. Please refresh the page.</p>
        `;
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      document.getElementById('uploadedDocumentsContainer').innerHTML = `
        <p class="text-center">Failed to load documents. Please refresh the page.</p>
      `;
    }
  }
  
  // Add the same getCleanDocumentPath function for consistent path handling
  function getCleanDocumentPath(originalPath) {
    // Get only the relative path within uploads directory
    let cleanPath = originalPath;
    
    // If it's a full URL or absolute path, extract just the filename with its subdirectory
    if (originalPath.includes('/uploads/')) {
      cleanPath = originalPath.substring(originalPath.indexOf('/uploads/') + 9);
    } else if (originalPath.includes('\\uploads\\')) {
      cleanPath = originalPath.substring(originalPath.indexOf('\\uploads\\') + 9);
    }
    
    // Handle paths that don't contain 'uploads' explicitly
    const directories = ['identity-documents', 'financial-documents', 'address-documents'];
    for (const dir of directories) {
      if (originalPath.includes(`/${dir}/`) || originalPath.includes(`\\${dir}\\`)) {
        const dirIndex = originalPath.indexOf(dir);
        if (dirIndex !== -1) {
          cleanPath = originalPath.substring(dirIndex);
          break;
        }
      }
    }
    
    // Ensure no leading slash
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    
    return cleanPath;
  }
  
  // Update the function that displays uploaded documents to use the improved handling
  function displayUploadedDocuments(documents) {
    const container = document.getElementById('uploadedDocumentsContainer');
    
    if (!documents || documents.length === 0) {
      container.innerHTML = '<p>No documents uploaded yet.</p>';
      return;
    }
    
    let html = '<div class="row">';
    
    documents.forEach(doc => {
      const fileExtension = doc.path.split('.').pop().toLowerCase();
      let iconClass = 'bi-file-earmark';
      
      if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        iconClass = 'bi-file-earmark-image';
      } else if (fileExtension === 'pdf') {
        iconClass = 'bi-file-earmark-pdf';
      }
      
      // Get clean path for download and view
      const downloadPath = getCleanDocumentPath(doc.path);
      
      // Create a view URL that works for both direct and API-based viewing
      let viewUrl = doc.path;
      if (!viewUrl.startsWith('http') && !viewUrl.startsWith('/')) {
        viewUrl = `/uploads/${downloadPath}`;
      }
      
      html += `
        <div class="col-md-4 mb-3">
          <div class="card h-100">
            <div class="card-body">
              <div class="text-center mb-2">
                <i class="bi ${iconClass} fs-1"></i>
              </div>
              <h5 class="card-title">${doc.documentType || doc.category || 'Document'}</h5>
              <p class="small text-muted">
                Category: ${doc.category || 'Unspecified'}<br>
                Uploaded: ${new Date(doc.uploadDate || doc.createdAt || new Date()).toLocaleDateString()}
              </p>
              <div class="btn-group w-100">
                <a href="${viewUrl}" class="btn btn-sm btn-primary" target="_blank">
                  <i class="bi bi-eye"></i> View
                </a>
                <a href="#" class="btn btn-sm btn-success document-download-btn" data-path="${downloadPath}">
                  <i class="bi bi-download"></i> Download
                </a>
                <button class="btn btn-sm btn-danger delete-document-btn" data-id="${doc._id}">
                  <i class="bi bi-trash"></i> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add event handlers for document actions
    addDocumentActionHandlers();
  }
  
  // Function to add event handlers for document actions
  function addDocumentActionHandlers() {
    // Add handlers for document download buttons
    document.querySelectorAll('.document-download-btn').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const docPath = this.getAttribute('data-path');
        downloadDocument(docPath);
      });
    });
    
    // Add handlers for document delete buttons
    document.querySelectorAll('.delete-document-btn').forEach(button => {
      button.addEventListener('click', function() {
        const documentId = this.getAttribute('data-id');
        deleteDocument(documentId);
      });
    });
  }
  
  // Improved document download function
  function downloadDocument(docPath) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // Create a direct download link
    const downloadUrl = `/user/download-document/${docPath}?token=${encodeURIComponent(token)}`;
    
    // Create a temporary anchor element to trigger the download
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = docPath.split('/').pop(); // Extract filename for download attribute
    downloadLink.style.display = 'none';
    
    // Add to document, trigger click, then remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up after a short delay to ensure the download starts
    setTimeout(() => {
      document.body.removeChild(downloadLink);
    }, 1000);
  }
  
  // Function to delete a document
  async function deleteDocument(documentId) {
    try {
      const response = await fetch(`/user/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert('Document deleted successfully!');
        fetchDocuments();
      } else {
        const data = await response.json();
        alert(data.message || 'Error deleting document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('An error occurred while deleting the document. Please try again.');
    }
  }
}); 