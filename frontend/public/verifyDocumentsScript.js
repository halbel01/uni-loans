document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in as admin
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
  
  if (!token || userRole !== 'admin') {
    alert('You must be logged in as an administrator to access this page');
    window.location.href = 'login.html';
    return;
  }
  
  // Get loan ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const loanId = urlParams.get('loanId');
  
  if (!loanId) {
    alert('No loan application specified');
    window.location.href = 'admin/dashboard.html';
    return;
  }
  
  // Set hidden input value
  document.getElementById('loanId').value = loanId;
  
  // Handle back button
  document.getElementById('backBtn').addEventListener('click', function() {
    window.location.href = 'admin/dashboard.html';
  });
  
  // Fetch loan application details
  fetchLoanDetails(loanId);
  
  // Handle verification form submission
  document.getElementById('verificationForm').addEventListener('submit', function(event) {
    event.preventDefault();
    submitVerification();
  });
  
  // Functions
  async function fetchLoanDetails(loanId) {
    try {
      const response = await fetch(`/admin/loans/${loanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        displayLoanDetails(data);
      } else {
        alert('Failed to fetch loan details');
        window.location.href = 'admin/dashboard.html';
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
      alert('An error occurred while fetching loan details');
    }
  }
  
  function displayLoanDetails(data) {
    // Application details
    document.getElementById('applicantName').textContent = data.user ? `${data.user.firstName} ${data.user.lastName}` : 'N/A';
    document.getElementById('applicantEmail').textContent = data.user ? data.user.email : 'N/A';
    document.getElementById('applicantPhone').textContent = data.user ? data.user.phone : 'N/A';
    document.getElementById('institution').textContent = data.loan.institution || data.loan.organization || 'N/A';
    document.getElementById('course').textContent = data.loan.course || 'N/A';
    document.getElementById('loanAmount').textContent = `£${data.loan.amount}` || 'N/A';
    
    // Financial information
    if (data.financialData) {
      document.getElementById('annualIncome').textContent = `£${data.financialData.annualIncome}` || 'N/A';
      document.getElementById('familyIncome').textContent = `£${data.financialData.familyIncome}` || 'N/A';
      document.getElementById('outstandingDebts').textContent = `£${data.financialData.outstandingDebts}` || '£0';
      document.getElementById('assets').textContent = `£${data.financialData.assets}` || '£0';
      document.getElementById('additionalNotes').textContent = data.financialData.additionalNotes || 'None provided';
    }
    
    // Documents
    if (data.documents && data.documents.length > 0) {
      document.getElementById('noDocumentsMsg').style.display = 'none';
      
      const documentsContainer = document.getElementById('documentsContainer');
      
      data.documents.forEach((doc, index) => {
        const docElement = document.createElement('div');
        docElement.className = 'col-md-4 mb-3';
        
        const fileExtension = doc.path.split('.').pop().toLowerCase();
        let iconClass = 'bi-file-earmark';
        
        if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
          iconClass = 'bi-file-earmark-image';
        } else if (fileExtension === 'pdf') {
          iconClass = 'bi-file-earmark-pdf';
        }
        
        docElement.innerHTML = `
          <div class="card h-100">
            <div class="card-body text-center">
              <i class="bi ${iconClass} fs-1 mb-3"></i>
              <h5 class="card-title">Document ${index + 1}</h5>
              <p class="card-text small text-muted">${getFileName(doc.path)}</p>
              <button class="btn btn-primary btn-sm view-doc" data-doc-path="${doc.path}">View Document</button>
            </div>
          </div>
        `;
        
        documentsContainer.appendChild(docElement);
      });
      
      // Add event listeners to view document buttons
      document.querySelectorAll('.view-doc').forEach(button => {
        button.addEventListener('click', function() {
          const docPath = this.getAttribute('data-doc-path');
          openDocumentPreview(docPath);
        });
      });
    }
  }
  
  function getFileName(path) {
    return path.split('/').pop();
  }
  
  function openDocumentPreview(docPath) {
    const fileExtension = docPath.split('.').pop().toLowerCase();
    const documentPreview = document.getElementById('documentPreview');
    const downloadLink = document.getElementById('downloadDoc');
    
    downloadLink.href = docPath;
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
      documentPreview.innerHTML = `<img src="${docPath}" class="img-fluid" alt="Document Preview">`;
    } else if (fileExtension === 'pdf') {
      documentPreview.innerHTML = `
        <iframe src="${docPath}" width="100%" height="500px" frameborder="0"></iframe>
      `;
    } else {
      documentPreview.innerHTML = `
        <div class="alert alert-info">
          <p>This file type cannot be previewed directly. Please download the document to view it.</p>
        </div>
      `;
    }
    
    const documentModal = new bootstrap.Modal(document.getElementById('documentModal'));
    documentModal.show();
  }
  
  async function submitVerification() {
    const loanId = document.getElementById('loanId').value;
    const verificationStatus = document.getElementById('verificationStatus').value;
    const verificationNotes = document.getElementById('verificationNotes').value;
    
    if (!verificationStatus) {
      alert('Please select a verification status');
      return;
    }
    
    try {
      const response = await fetch('/admin/verify-documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          loanId,
          verificationStatus,
          verificationNotes
        })
      });
      
      if (response.ok) {
        alert('Document verification completed successfully');
        window.location.href = 'admin/dashboard.html';
      } else {
        const error = await response.json();
        alert(`Failed to submit verification: ${error.message}`);
      }
    } catch (error) {
      console.error('Error submitting verification:', error);
      alert('An error occurred while submitting the verification');
    }
  }
}); 