document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    if (!token || !userId) {
      alert('You must be logged in to apply for a loan');
      window.location.href = 'login.html';
      return;
    }
    
    // Set hidden userId field
    document.getElementById('userId').value = userId;
    
    // Check if user has uploaded required documents
    checkDocumentStatus();
    
    // Function to check document status
    async function checkDocumentStatus() {
      try {
        const response = await fetch(`/user/document-status/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const status = await response.json();
        console.log('Document status from server:', status);
        
        // If we cannot get a valid response, assume user can continue
        if (!response.ok) {
          console.error('Error fetching document status, proceeding with form');
          initializeForm();
          return;
        }
        
        if (!status.canApplyForLoan) {
          // Replace the form with a message directing the user to upload documents or complete financial data
          const container = document.querySelector('.card-body');
          let message = '<h2 class="card-title text-center mb-4">Documents Required</h2>';
          message += '<div class="alert alert-warning">';
          message += '<p class="mb-3">Before applying for a loan, you need to complete the following:</p>';
          message += '<ul>';
          
          if (!status.hasIdentityDocuments) {
            message += '<li>Upload identification documents (Passport, Driver\'s License, or National ID)</li>';
          }
          
          if (!status.hasFinancialDocuments) {
            message += '<li>Upload financial documents (Payslips, Bank Statements, or Tax Returns)</li>';
          }
          
          if (!status.hasFinancialData) {
            message += '<li>Complete your financial information</li>';
          }
          
          message += '</ul>';
          message += '</div>';
          
          message += '<div class="d-grid gap-2">';
          
          if (!status.hasIdentityDocuments || !status.hasFinancialDocuments) {
            message += '<a href="upload-documents.html" class="btn btn-primary mb-2">Upload Documents</a>';
          }
          
          if (!status.hasFinancialData) {
            message += '<a href="financial-data.html" class="btn btn-primary mb-2">Complete Financial Information</a>';
          }
          
          message += '<a href="dashboard.html" class="btn btn-outline-secondary">Back to Dashboard</a>';
          message += '</div>';
          
          container.innerHTML = message;
          
          // Hide the form
          const loanApplicationForm = document.getElementById('loanApplicationForm');
          if (loanApplicationForm) {
            loanApplicationForm.style.display = 'none';
          }
          
          return;
        }
        
        // If documents are uploaded, show the form and continue with normal flow
        initializeForm();
      } catch (error) {
        console.error('Error checking document status:', error);
        // If error occurs, allow user to proceed with form anyway
        initializeForm();
      }
    }
    
    // Function to initialize the form
    function initializeForm() {
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
      
      // Show/hide other purpose field based on selection
      document.getElementById('purpose').addEventListener('change', function() {
        const otherPurposeField = document.getElementById('otherPurposeField');
        if (this.value === 'Other') {
          otherPurposeField.style.display = 'block';
          document.getElementById('otherPurpose').required = true;
        } else {
          otherPurposeField.style.display = 'none';
          document.getElementById('otherPurpose').required = false;
        }
      });
      
      // Handle form submission
      const loanApplicationForm = document.getElementById('loanApplicationForm');
      loanApplicationForm.addEventListener('submit', function(event) {
        event.preventDefault();
        submitLoanApplication();
      });
    }
    
    // Function to submit loan application
    async function submitLoanApplication() {
      const formData = {
        userId: document.getElementById('userId').value,
        organization: document.getElementById('organization').value,
        course: document.getElementById('course').value,
        amount: parseFloat(document.getElementById('amount').value),
        purpose: document.getElementById('purpose').value,
        studyDuration: parseInt(document.getElementById('studyDuration').value)
      };
      
      // Add other purpose if selected
      if (formData.purpose === 'Other') {
        formData.otherPurpose = document.getElementById('otherPurpose').value;
      }
      
      console.log('Submitting loan application:', formData);
      
      try {
        const response = await fetch('/loan/apply', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        // Handle different response types
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const textResponse = await response.text();
          data = { message: textResponse };
        }
        
        if (response.ok) {
          alert('Loan application submitted successfully!');
          window.location.href = 'dashboard.html';
        } else {
          // Handle specific error case for missing documents
          if (response.status === 403 && data.missingDocuments) {
            if (data.missingDocuments === 'identification') {
              alert('You must upload identification documents before applying for a loan. Redirecting to document upload page.');
            } else if (data.missingDocuments === 'financial') {
              alert('You must upload financial documents before applying for a loan. Redirecting to document upload page.');
            }
            window.location.href = 'upload-documents.html';
          } else {
            alert(data.message || 'Error submitting loan application');
          }
        }
      } catch (error) {
        console.error('Error submitting loan application:', error);
        alert('An error occurred while submitting your loan application. Please try again.');
      }
    }
  });