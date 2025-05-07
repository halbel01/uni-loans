document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is an admin
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    const userName = localStorage.getItem('userName') || sessionStorage.getItem('userName');
    
    console.log('Admin dashboard loading. Auth token exists:', !!token);
    console.log('User role:', userRole);
    
    if (!token) {
      alert('You must be logged in to access the admin dashboard');
      window.location.href = '../login.html';
      return;
    }
    
    if (userRole !== 'admin') {
      alert('Access denied. Admin privileges required.');
      window.location.href = '../dashboard.html';
      return;
    }
    
    // Display admin name
    if (userName) {
      document.getElementById('adminName').textContent = userName;
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
      window.location.href = '../login.html';
    });
    
    // debug info
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'none');
    
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.dashboard-section');
    
    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all links
        navLinks.forEach(nl => nl.classList.remove('active'));
        
        // Add active class to clicked link
        this.classList.add('active');
        
        // Hide all sections
        sections.forEach(section => section.classList.add('d-none'));
        
        // Show corresponding section
        const targetId = this.getAttribute('href').substring(1) + 'Section';
        document.getElementById(targetId).classList.remove('d-none');
      });
    });
    
    // Initialize dashboard
    loadDashboardOverview();
    
    // Add direct loading for debugging
    console.log('Directly loading loan applications');
    loadLoanApplications('all');
    
    // Try loading loans directly (for debugging)
    fetch('/admin/loans', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      console.log('Direct loans fetch result:', data);
    })
    .catch(error => {
      console.error('Direct loans fetch error:', error);
    });
    
    // Set up event listeners for section-specific buttons
    document.getElementById('allApplicationsBtn').addEventListener('click', () => loadLoanApplications('all'));
    document.getElementById('pendingApplicationsBtn').addEventListener('click', () => loadLoanApplications('pending'));
    document.getElementById('approvedApplicationsBtn').addEventListener('click', () => loadLoanApplications('approved'));
    document.getElementById('rejectedApplicationsBtn').addEventListener('click', () => loadLoanApplications('rejected'));
    
    // Try to safely add event listeners for user section buttons
    try {
    document.getElementById('allUsersBtn').addEventListener('click', () => loadUsers('all'));
    document.getElementById('pendingVerificationBtn').addEventListener('click', () => loadUsers('pending'));
    document.getElementById('verifiedUsersBtn').addEventListener('click', () => loadUsers('verified'));
    } catch (e) {
      console.error('Error setting up user filter buttons:', e);
    }
    
    // Handle modal buttons
    document.getElementById('addUserBtn').addEventListener('click', function() {
      const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
      addUserModal.show();
    });
    
    document.getElementById('saveUserBtn').addEventListener('click', saveNewUser);
    
    // Try to safely add event listeners for settings forms
    try {
    document.getElementById('loanSettingsForm').addEventListener('submit', saveLoanSettings);
    document.getElementById('notificationSettingsForm').addEventListener('submit', saveNotificationSettings);
    } catch (e) {
      console.error('Error setting up settings forms:', e);
    }
    
    // Load data for each section when link is clicked
    document.getElementById('loanApplicationsLink').addEventListener('click', () => loadLoanApplications('all'));
    document.getElementById('userManagementLink').addEventListener('click', loadUserManagement);
    
    // Try to safely add event listeners for other section links
    try {
    document.getElementById('userVerificationLink').addEventListener('click', () => loadUsers('all'));
    document.getElementById('repaymentsLink').addEventListener('click', loadRepayments);
    } catch (e) {
      console.error('Error setting up section links:', e);
    }
    
    // Function to load dashboard overview
    async function loadDashboardOverview() {
      console.log('Loading dashboard overview...');
      try {
        const response = await fetch('/admin/dashboard-overview', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Dashboard overview response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Dashboard overview data:', data);
          
          // Update dashboard metrics
          document.getElementById('totalApplications').textContent = data.totalApplications || 0;
          document.getElementById('pendingApplications').textContent = data.pendingApplications || 0;
          document.getElementById('approvedApplications').textContent = data.approvedApplications || 0;
          document.getElementById('rejectedApplications').textContent = data.rejectedApplications || 0;
          
          // Load recent applications and repayments
          loadRecentApplications(data.recentApplications || []);
          loadRecentRepayments(data.recentRepayments || []);
        } else {
          console.error('Failed to load dashboard overview', await response.text());
        }
      } catch (error) {
        console.error('Error loading dashboard overview:', error);
      }
    }
    
    // Function to load recent applications
    function loadRecentApplications(applications) {
      const container = document.getElementById('recentApplicationsTable');
      
      if (applications.length === 0) {
        container.innerHTML = '<p class="text-center">No recent applications</p>';
        return;
      }
      
      let html = `
        <table class="table table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Applicant</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      applications.forEach(app => {
        const statusClass = getStatusClass(app.status);
        
        html += `
          <tr>
            <td>${app._id.substring(0, 8)}...</td>
            <td>${app.applicantName}</td>
            <td>£${app.amount}</td>
            <td><span class="badge ${statusClass}">${app.status}</span></td>
            <td>${new Date(app.createdAt).toLocaleDateString()}</td>
          </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
        <a href="#loanApplications" class="btn btn-sm btn-link d-block text-end" id="viewAllApplicationsLink">View All</a>
      `;
      
      container.innerHTML = html;
      
      // Add event listener to "View All" link
      document.getElementById('viewAllApplicationsLink').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('loanApplicationsLink').click();
      });
    }
    
    // Function to load recent repayments
    function loadRecentRepayments(repayments) {
      const container = document.getElementById('recentRepaymentsTable');
      
      if (repayments.length === 0) {
        container.innerHTML = '<p class="text-center">No recent repayments</p>';
        return;
      }
      
      let html = `
        <table class="table table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      repayments.forEach(payment => {
        html += `
          <tr>
            <td>${payment._id.substring(0, 8)}...</td>
            <td>${payment.userName}</td>
            <td>£${payment.amountPaid}</td>
            <td>${payment.paymentMethod}</td>
            <td>${new Date(payment.date).toLocaleDateString()}</td>
          </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
        <a href="#repayments" class="btn btn-sm btn-link d-block text-end" id="viewAllRepaymentsLink">View All</a>
      `;
      
      container.innerHTML = html;
      
      // Add event listener to "View All" link
      document.getElementById('viewAllRepaymentsLink').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('repaymentsLink').click();
      });
    }
    
    // Function to load loan applications
    async function loadLoanApplications(status = 'all') {
      const container = document.getElementById('applicationsTableContainer');
      container.innerHTML = '<p class="text-center">Loading applications...</p>';
      
      console.log(`Loading loan applications with status: ${status}`);
      
      // Update active button
      const buttons = document.querySelectorAll('#loanApplicationsSection .btn-group .btn');
      buttons.forEach(button => button.classList.remove('active'));
      
      switch(status) {
        case 'pending':
          document.getElementById('pendingApplicationsBtn').classList.add('active');
          break;
        case 'approved':
          document.getElementById('approvedApplicationsBtn').classList.add('active');
          break;
        case 'rejected':
          document.getElementById('rejectedApplicationsBtn').classList.add('active');
          break;
        default:
          document.getElementById('allApplicationsBtn').classList.add('active');
      }
      
      try {
        console.log(`Fetching from: /admin/loan-applications?status=${status}`);
        
        const response = await fetch(`/admin/loan-applications?status=${status}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const applications = await response.json();
          console.log(`Received ${applications.length} applications:`, applications);
          
          if (applications.length === 0) {
            container.innerHTML = '<p class="text-center">No applications found</p>';
            return;
          }
          
          let html = `
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Applicant</th>
                  <th>Institution</th>
                  <th>Amount</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          applications.forEach(app => {
            const statusClass = getStatusClass(app.status);
            
            html += `
              <tr>
                <td>${app._id.substring(0, 8)}...</td>
                <td>${app.applicantName || 'Unknown'}</td>
                <td>${app.organization || app.institution || 'Not specified'}</td>
                <td>£${app.amount || 0}</td>
                <td>${app.purpose || 'Not specified'}</td>
                <td><span class="badge ${statusClass}">${app.status || 'Unknown'}</span></td>
                <td>${app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Unknown'}</td>
                <td>
                  <button class="btn btn-sm btn-primary review-application-btn" data-id="${app._id}">
                    <i class="bi bi-eye"></i> Review
                  </button>
                </td>
              </tr>
            `;
          });
          
          html += `
              </tbody>
            </table>
          `;
          
          container.innerHTML = html;
          
          // Add event listeners to review buttons
          document.querySelectorAll('.review-application-btn').forEach(button => {
            button.addEventListener('click', function() {
              const applicationId = this.getAttribute('data-id');
              openApplicationReviewModal(applicationId);
            });
          });
        } else {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          container.innerHTML = `
            <div class="alert alert-danger">
              <p class="text-center">Failed to load applications</p>
              <p>Status: ${response.status}</p>
              <p>Error: ${errorText}</p>
            </div>
          `;
        }
      } catch (error) {
        console.error('Error loading loan applications:', error);
        container.innerHTML = `
          <div class="alert alert-danger">
            <p class="text-center">Failed to load applications</p>
            <p>Error: ${error.message}</p>
          </div>
        `;
      }
    }
    
    // Function to open application review modal
    async function openApplicationReviewModal(applicationId) {
      const modal = new bootstrap.Modal(document.getElementById('reviewApplicationModal'));
      const container = document.getElementById('applicationDetailsContainer');
      
      container.innerHTML = '<p class="text-center">Loading application details...</p>';
      modal.show();
      
      try {
        const response = await fetch(`/admin/loan-application/${applicationId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const application = await response.json();
          displayApplicationDetails(application);
          
          // Set up event listeners for application approval/rejection
          document.getElementById('approveApplicationBtn').onclick = () => updateApplicationStatus(applicationId, 'Approved');
          document.getElementById('rejectApplicationBtn').onclick = () => updateApplicationStatus(applicationId, 'Rejected');
        } else {
          container.innerHTML = '<p class="text-center">Failed to load application details</p>';
        }
      } catch (error) {
        console.error('Error loading application details:', error);
        container.innerHTML = '<p class="text-center">Failed to load application details</p>';
      }
    }
    
    // Function to display application details in modal
    function displayApplicationDetails(application) {
      const container = document.getElementById('applicationDetailsContainer');
      const statusClass = getStatusClass(application.status);
      
      // No interest calculation (0% interest)
      const principalAmount = application.amount || 0;
      const interestRate = 0; // 0% interest rate (interest-free)
      const interestAmount = 0; // No interest
      const totalAmount = principalAmount; // Total amount equals principal amount
      
      let html = `
        <div class="row">
          <div class="col-md-6">
            <h5>Applicant Information</h5>
            <p><strong>Name:</strong> ${application.applicantName}</p>
            <p><strong>Email:</strong> ${application.applicantEmail}</p>
            <p><strong>ID Number:</strong> ${application.idNumber || 'Not provided'}</p>
            <p><strong>Contact:</strong> ${application.phoneNumber || 'Not provided'}</p>
          </div>
          <div class="col-md-6">
            <h5>Application Details</h5>
            <p><strong>ID:</strong> ${application._id}</p>
            <p><strong>Status:</strong> <span class="badge ${statusClass}">${application.status}</span></p>
            <p><strong>Submission Date:</strong> ${new Date(application.createdAt).toLocaleDateString()}</p>
            <p><strong>Last Updated:</strong> ${new Date(application.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        <hr>
        
        <div class="row">
          <div class="col-md-6">
            <h5>Loan Information</h5>
            <p><strong>Institution/Organization:</strong> ${application.organization || application.institution}</p>
            <p><strong>Course:</strong> ${application.course}</p>
            <p><strong>Purpose:</strong> ${application.purpose || 'Not specified'}</p>
            <p><strong>Duration of Study:</strong> ${application.studyDuration || 'Not specified'} year(s)</p>
          </div>
          <div class="col-md-6">
            <h5>Financial Information</h5>
            <p><strong>Principal Amount:</strong> £${principalAmount.toLocaleString()}</p>
            <p><strong>Interest Rate:</strong> ${interestRate}% (Interest-Free)</p>
            <p><strong>Interest Amount:</strong> £${interestAmount.toLocaleString()}</p>
            <p><strong>Total Amount:</strong> £${totalAmount.toLocaleString()}</p>
            <p><strong>Income Source:</strong> ${application.incomeSource || 'Not provided'}</p>
          </div>
        </div>
        
        <hr>
        
        <div class="row">
          <div class="col-md-12">
            <h5>Documents</h5>
            <div class="row">
              ${application.documents && application.documents.length > 0 
                ? application.documents.map(doc => createDocumentCard(doc)).join('')
                : '<p>No documents uploaded</p>'
              }
            </div>
          </div>
        </div>
        
        <hr>
        
        <div class="mb-3">
          <label for="applicationReviewNotes" class="form-label">Admin Notes</label>
          <textarea class="form-control" id="applicationReviewNotes" rows="3">${application.adminNotes || ''}</textarea>
        </div>
      `;
      
      container.innerHTML = html;
      
      // Add document download handlers
      addDocumentDownloadHandlers();
    }
    
    // Helper function to correctly extract the document path for downloads
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
    
    // Updated createDocumentCard function with improved path handling
    function createDocumentCard(doc) {
      if (!doc || !doc.path) {
        console.error('Invalid document object:', doc);
        return '<div class="col-md-4 mb-3"><div class="card"><div class="card-body">Invalid document</div></div></div>';
      }
      
      // Get file extension
      const fileExtension = doc.path.split('.').pop().toLowerCase();
      let iconClass = 'bi-file-earmark';
      
      // Choose icon based on file type
      if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        iconClass = 'bi-file-earmark-image';
      } else if (fileExtension === 'pdf') {
        iconClass = 'bi-file-earmark-pdf';
      }
      
      // Get clean path for download
      const downloadPath = getCleanDocumentPath(doc.path);
      
      // Create a view URL that works for both direct and API-based viewing
      let viewUrl = doc.path;
      if (!viewUrl.startsWith('http') && !viewUrl.startsWith('/')) {
        viewUrl = `/uploads/${downloadPath}`;
      }
      
      return `
        <div class="col-md-4 mb-3">
          <div class="card">
            <div class="card-body">
              <div class="text-center mb-2">
                <i class="bi ${iconClass} fs-1"></i>
              </div>
              <h6>${doc.documentType || getDocumentType(doc.category)}</h6>
              <p class="small text-muted">
                Category: ${doc.category || 'Unknown'}<br>
                Uploaded: ${new Date(doc.uploadDate || doc.createdAt || new Date()).toLocaleDateString()}
              </p>
              <div class="btn-group w-100">
                <a href="${viewUrl}" class="btn btn-sm btn-primary" target="_blank">
                  <i class="bi bi-eye"></i> View
                </a>
                <a href="#" class="btn btn-sm btn-success download-doc-btn" data-path="${downloadPath}">
                  <i class="bi bi-download"></i> Download
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Add event handlers for document downloads (call this after rendering cards)
    function addDocumentDownloadHandlers() {
      document.querySelectorAll('.download-doc-btn').forEach(button => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          const docPath = this.getAttribute('data-path');
          downloadDocument(docPath);
        });
      });
    }
    
    // Improved document download function that works more reliably
    function downloadDocument(docPath) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Create a direct download link
      const downloadUrl = `/admin/download-document/${docPath}?token=${encodeURIComponent(token)}`;
      
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
    
    // Function to update application status
    async function updateApplicationStatus(applicationId, status) {
      const adminNotes = document.getElementById('applicationReviewNotes').value;
      
      try {
        const response = await fetch(`/admin/loan-application/${applicationId}/update-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status,
            adminNotes
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          alert(`Application ${status.toLowerCase()} successfully!`);
          
          // Close modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('reviewApplicationModal'));
          modal.hide();
          
          // Refresh loan applications
          loadLoanApplications(document.querySelector('#loanApplicationsSection .btn-group .btn.active').textContent.toLowerCase());
        } else {
          const data = await response.json();
          alert(data.message || `Failed to update application status to ${status}`);
        }
      } catch (error) {
        console.error('Error updating application status:', error);
        alert(`Error updating application status to ${status}`);
      }
    }
    
    // Function to load users
    async function loadUsers(status = 'all') {
      const container = document.getElementById('usersTableContainer');
      container.innerHTML = '<p class="text-center">Loading users...</p>';
      
      // Update active button
      const buttons = document.querySelectorAll('#userVerificationSection .btn-group .btn');
      buttons.forEach(button => button.classList.remove('active'));
      
      switch(status) {
        case 'pending':
          document.getElementById('pendingVerificationBtn').classList.add('active');
          break;
        case 'verified':
          document.getElementById('verifiedUsersBtn').classList.add('active');
          break;
        default:
          document.getElementById('allUsersBtn').classList.add('active');
      }
      
      try {
        const response = await fetch(`/admin/users?verification=${status}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const users = await response.json();
          
          if (users.length === 0) {
            container.innerHTML = '<p class="text-center">No users found</p>';
            return;
          }
          
          let html = `
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Verification Status</th>
                  <th>Registration Date</th>
                  <th>Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          users.forEach(user => {
            const verificationStatus = user.isVerified ? 'Verified' : 'Pending Verification';
            const statusClass = user.isVerified ? 'bg-success' : 'bg-warning text-dark';
            
            html += `
              <tr>
                <td>${user._id.substring(0, 8)}...</td>
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td><span class="badge ${statusClass}">${verificationStatus}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>${user.documents ? user.documents.length : 0} uploaded</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-sm btn-primary view-user-btn" data-id="${user._id}">
                      <i class="bi bi-eye"></i> View
                    </button>
                    ${!user.isVerified ? `
                      <button class="btn btn-sm btn-success verify-user-btn" data-id="${user._id}">
                        <i class="bi bi-check-lg"></i> Verify
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `;
          });
          
          html += `
              </tbody>
            </table>
          `;
          
          container.innerHTML = html;
          
          // Add event listeners to user action buttons
          document.querySelectorAll('.view-user-btn').forEach(button => {
            button.addEventListener('click', function() {
              const userId = this.getAttribute('data-id');
              viewUserDetails(userId);
            });
          });
          
          document.querySelectorAll('.verify-user-btn').forEach(button => {
            button.addEventListener('click', function() {
              const userId = this.getAttribute('data-id');
              verifyUser(userId);
            });
          });
        } else {
          container.innerHTML = '<p class="text-center">Failed to load users</p>';
        }
      } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<p class="text-center">Failed to load users</p>';
      }
    }
    
    // Function to view user details
    async function viewUserDetails(userId) {
      try {
        // Create and show a modal for user details
        const modalHtml = `
          <div class="modal fade" id="userDetailsModal" tabindex="-1" aria-labelledby="userDetailsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="userDetailsModalLabel">User Details</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <div id="userDetailsContainer">
                    <p class="text-center">Loading user details...</p>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Add modal to body if it doesn't exist yet
        if (!document.getElementById('userDetailsModal')) {
          const modalContainer = document.createElement('div');
          modalContainer.innerHTML = modalHtml;
          document.body.appendChild(modalContainer);
        }
        
        // Show modal
        const userModal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
        userModal.show();
        
        const container = document.getElementById('userDetailsContainer');
        
        // Fetch user details and documents
        const response = await fetch(`/admin/user-documents/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          container.innerHTML = `
            <div class="alert alert-danger">
              Failed to load user details. Status: ${response.status}
            </div>
          `;
          return;
        }
        
        const data = await response.json();
        const { user, documents } = data;
        
        // Fetch additional user information
        const userResponse = await fetch(`/admin/users/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        let userDetails = {};
        if (userResponse.ok) {
          userDetails = await userResponse.json();
        }
        
        // Fetch document status
        const statusResponse = await fetch(`/admin/user-document-status/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        let documentStatus = {
          documentStatus: {
            hasIdentityDocuments: false,
            hasFinancialDocuments: false,
            hasFinancialData: false,
            canApplyForLoan: false
          }
        };
        
        if (statusResponse.ok) {
          documentStatus = await statusResponse.json();
        }
        
        // Create user info HTML
        let userHtml = `
          <div class="card mb-4">
            <div class="card-header d-flex justify-content-between">
              <h5 class="mb-0">User Information</h5>
              ${userDetails.isVerified ? 
                '<span class="badge bg-success">Verified</span>' : 
                '<span class="badge bg-warning text-dark">Pending Verification</span>'
              }
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <p><strong>ID:</strong> ${user._id}</p>
                  <p><strong>Name:</strong> ${user.name || userDetails.fullName || 'Not provided'}</p>
                  <p><strong>Email:</strong> ${user.email}</p>
                  <p><strong>Role:</strong> ${userDetails.role || 'User'}</p>
                </div>
                <div class="col-md-6">
                  <p><strong>Registration Date:</strong> ${userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleDateString() : 'Unknown'}</p>
                  <p><strong>Last Update:</strong> ${userDetails.updatedAt ? new Date(userDetails.updatedAt).toLocaleDateString() : 'Unknown'}</p>
                  <p><strong>Phone:</strong> ${userDetails.phoneNumber || 'Not provided'}</p>
                  <p><strong>Address:</strong> ${userDetails.address || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Create document status HTML
        const { documentStatus: status } = documentStatus;
        let statusHtml = `
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0">Document Status</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <p>
                    <strong>Identity Documents:</strong> 
                    ${status.hasIdentityDocuments ? 
                      '<span class="badge bg-success">Provided</span>' : 
                      '<span class="badge bg-danger">Missing</span>'
                    }
                  </p>
                  <p>
                    <strong>Financial Documents:</strong> 
                    ${status.hasFinancialDocuments ? 
                      '<span class="badge bg-success">Provided</span>' : 
                      '<span class="badge bg-danger">Missing</span>'
                    }
                  </p>
                </div>
                <div class="col-md-6">
                  <p>
                    <strong>Financial Data:</strong> 
                    ${status.hasFinancialData ? 
                      '<span class="badge bg-success">Provided</span>' : 
                      '<span class="badge bg-danger">Missing</span>'
                    }
                  </p>
                  <p>
                    <strong>Loan Application Eligibility:</strong> 
                    ${status.canApplyForLoan ? 
                      '<span class="badge bg-success">Eligible</span>' : 
                      '<span class="badge bg-danger">Not Eligible</span>'
                    }
                  </p>
                </div>
              </div>
              ${!status.canApplyForLoan ? `
                <div class="alert alert-warning mt-3">
                  <p><strong>Missing requirements:</strong></p>
                  <ul>
                    ${!status.hasIdentityDocuments ? '<li>Identity documents</li>' : ''}
                    ${!status.hasFinancialDocuments ? '<li>Financial documents</li>' : ''}
                    ${!status.hasFinancialData ? '<li>Financial data</li>' : ''}
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        
        // Create documents HTML
        let documentsHtml = `
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">User Documents (${documents.length})</h5>
            </div>
            <div class="card-body">
        `;
        
        if (documents.length === 0) {
          documentsHtml += `<p class="text-center">No documents uploaded yet</p>`;
        } else {
          documentsHtml += `<div class="row">`;
          documents.forEach(doc => {
            documentsHtml += createDocumentCard(doc);
          });
          documentsHtml += `</div>`;
        }
        
        documentsHtml += `
            </div>
          </div>
        `;
        
        // Add verify button if user is not verified
        let verifyHtml = '';
        if (userDetails && !userDetails.isVerified) {
          verifyHtml = `
            <div class="text-center mt-4">
              <button class="btn btn-success" id="verifyUserBtn" data-id="${userId}">
                <i class="bi bi-check-circle"></i> Verify User
              </button>
            </div>
          `;
        }
        
        // Combine all sections
        container.innerHTML = userHtml + statusHtml + documentsHtml + verifyHtml;
        
        // Add document download handlers
        addDocumentDownloadHandlers();
        
        // Add verify button handler if it exists
        const verifyButton = document.getElementById('verifyUserBtn');
        if (verifyButton) {
          verifyButton.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            verifyUser(userId);
            // Close the modal after verification
            const modal = bootstrap.Modal.getInstance(document.getElementById('userDetailsModal'));
            modal.hide();
          });
        }
      } catch (error) {
        console.error('Error viewing user details:', error);
        const container = document.getElementById('userDetailsContainer');
        if (container) {
          container.innerHTML = `
            <div class="alert alert-danger">
              <p>Error loading user details: ${error.message}</p>
            </div>
          `;
        }
      }
    }
    
    // Function to verify a user
    async function verifyUser(userId) {
      if (confirm('Are you sure you want to verify this user?')) {
        try {
          const response = await fetch(`/admin/users/${userId}/verify`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            alert('User verified successfully!');
            loadUsers('all');
          } else {
            const data = await response.json();
            alert(data.message || 'Failed to verify user');
          }
        } catch (error) {
          console.error('Error verifying user:', error);
          alert('Failed to verify user');
        }
      }
    }
    
    // Function to load repayments
    async function loadRepayments() {
      const container = document.getElementById('repaymentsTableContainer');
      container.innerHTML = '<p class="text-center">Loading repayments...</p>';
      
      try {
        const response = await fetch('/admin/repayments', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const repayments = await response.json();
          
          if (repayments.length === 0) {
            container.innerHTML = '<p class="text-center">No repayments found</p>';
            return;
          }
          
          let html = `
            <div class="table-responsive">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>Loan ID</th>
                    <th>User</th>
                    <th>Institution</th>
                    <th>Principal</th>
                    <th>Interest (0%)</th>
                    <th>Total</th>
                    <th>Remaining</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          repayments.forEach(loan => {
            // Calculate interest amount if not provided
            const principalAmount = loan.amount;
            const interestRate = 0; // 0% interest rate (interest-free)
            const interestAmount = 0; // No interest
            const totalAmount = principalAmount; // Total equals principal
            const remainingBalance = loan.remainingBalance;
            
            // Calculate repayment progress
            const repaidAmount = totalAmount - remainingBalance;
            const progressPercentage = Math.round((repaidAmount / totalAmount) * 100);
            
            // Determine loan status class
            let statusClass = 'bg-primary';
            if (progressPercentage >= 100) {
              statusClass = 'bg-success';
            } else if (progressPercentage >= 75) {
              statusClass = 'bg-info';
            } else if (progressPercentage >= 50) {
              statusClass = 'bg-primary';
            } else if (progressPercentage >= 25) {
              statusClass = 'bg-warning';
            } else {
              statusClass = 'bg-danger';
            }
            
            html += `
              <tr>
                <td>${loan._id.substring(0, 8)}...</td>
                <td>${loan.userName || 'Unknown'}</td>
                <td>${loan.organization || loan.institution || 'Not specified'}</td>
                <td>£${principalAmount.toLocaleString()}</td>
                <td>£${interestAmount.toLocaleString()}</td>
                <td>£${totalAmount.toLocaleString()}</td>
                <td>£${remainingBalance.toLocaleString()}</td>
                <td>
                  <div class="progress" style="height: 20px;">
                    <div class="progress-bar ${statusClass}" style="width: ${progressPercentage}%;" role="progressbar" 
                         aria-valuenow="${progressPercentage}" aria-valuemin="0" aria-valuemax="100">
                      ${progressPercentage}%
                    </div>
                  </div>
                </td>
                <td>
                  <button class="btn btn-sm btn-info view-repayments-btn" data-id="${loan._id}">
                    <i class="bi bi-list-ul"></i> History
                  </button>
                  <button class="btn btn-sm btn-primary view-loan-btn" data-id="${loan._id}">
                    <i class="bi bi-eye"></i> View
                  </button>
                </td>
              </tr>
            `;
          });
          
          html += `
              </tbody>
            </table>
            </div>
          `;
          
          container.innerHTML = html;
          
          // Add event listeners to view repayments buttons
          document.querySelectorAll('.view-repayments-btn').forEach(button => {
            button.addEventListener('click', function() {
              const loanId = this.getAttribute('data-id');
              viewRepaymentHistory(loanId);
            });
          });
          
          // Add event listeners to view loan buttons
          document.querySelectorAll('.view-loan-btn').forEach(button => {
            button.addEventListener('click', function() {
              const loanId = this.getAttribute('data-id');
              openApplicationReviewModal(loanId);
            });
          });
        } else {
          container.innerHTML = '<p class="text-center">Failed to load repayments</p>';
        }
      } catch (error) {
        console.error('Error loading repayments:', error);
        container.innerHTML = '<p class="text-center">Error loading repayments</p>';
      }
    }
    
    // Function to view repayment history
    async function viewRepaymentHistory(loanId) {
      const modal = new bootstrap.Modal(document.getElementById('repaymentHistoryModal'));
      const container = document.getElementById('repaymentHistoryContainer');
      
      container.innerHTML = '<p class="text-center">Loading repayment history...</p>';
      modal.show();
      
      try {
        const response = await fetch(`/loan/repayment-history/${loanId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const repaymentHistory = data.repaymentHistory || [];
          
          if (repaymentHistory.length === 0) {
            container.innerHTML = '<p class="text-center">No repayments have been made yet.</p>';
            return;
          }
          
          let html = `
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount Paid</th>
                    <th>Payment Method</th>
                    <th>Receipt Number</th>
                  </tr>
                </thead>
                <tbody>
          `;
          
          repaymentHistory.forEach(payment => {
            html += `
              <tr>
                <td>${new Date(payment.date).toLocaleDateString()}</td>
                <td>£${payment.amountPaid.toLocaleString()}</td>
                <td>${formatPaymentMethod(payment.paymentMethod)}</td>
                <td>${payment.receiptNumber || 'N/A'}</td>
              </tr>
            `;
          });
          
          html += `
                </tbody>
              </table>
            </div>
          `;
          
          container.innerHTML = html;
        } else {
          container.innerHTML = '<p class="text-center">Failed to load repayment history</p>';
        }
      } catch (error) {
        console.error('Error loading repayment history:', error);
        container.innerHTML = '<p class="text-center">Error loading repayment history</p>';
      }
    }
    
    // Helper function to format payment method for display
    function formatPaymentMethod(method) {
      if (!method) return 'Not specified';
      
      // Convert camelCase to Title Case with spaces
      return method
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
    }
    
    // Function to load user management
    async function loadUserManagement() {
      const container = document.getElementById('userManagementTableContainer');
      container.innerHTML = '<p class="text-center">Loading users...</p>';
      
      try {
        const response = await fetch('/admin/users', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const users = await response.json();
          
          if (users.length === 0) {
            container.innerHTML = '<p class="text-center">No users found</p>';
            return;
          }
          
          let html = `
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verification Status</th>
                  <th>Registration Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          users.forEach(user => {
            const verificationStatus = user.isVerified ? 'Verified' : 'Pending Verification';
            const statusClass = user.isVerified ? 'bg-success' : 'bg-warning text-dark';
            
            html += `
              <tr>
                <td>${user._id.substring(0, 8)}...</td>
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td>${user.role || 'user'}</td>
                <td><span class="badge ${statusClass}">${verificationStatus}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-sm btn-primary edit-user-btn" data-id="${user._id}">
                      <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user._id}">
                      <i class="bi bi-trash"></i> Delete
                    </button>
                  </div>
                </td>
              </tr>
            `;
          });
          
          html += `
              </tbody>
            </table>
          `;
          
          container.innerHTML = html;
          
          // Add event listeners to user action buttons
          document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', function() {
              const userId = this.getAttribute('data-id');
              editUser(userId);
            });
          });
          
          document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', function() {
              const userId = this.getAttribute('data-id');
              deleteUser(userId);
            });
          });
        } else {
          container.innerHTML = '<p class="text-center">Failed to load users</p>';
        }
      } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<p class="text-center">Failed to load users</p>';
      }
    }
    
    // Function to edit user
    function editUser(userId) {
      // Implement user edit functionality
      alert('Edit user functionality will be implemented here');
    }
    
    // Function to delete user
    async function deleteUser(userId) {
      if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        try {
          const response = await fetch(`/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            alert('User deleted successfully!');
            loadUserManagement();
          } else {
            const data = await response.json();
            alert(data.message || 'Failed to delete user');
          }
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('Failed to delete user');
        }
      }
    }
    
    // Function to save a new user
    async function saveNewUser() {
      const fullName = document.getElementById('fullName').value;
      const email = document.getElementById('userEmail').value;
      const password = document.getElementById('userPassword').value;
      const role = document.getElementById('userRole').value;
      
      if (!fullName || !email || !password || !role) {
        alert('Please fill in all fields');
        return;
      }
      
      try {
        const response = await fetch('/admin/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fullName,
            email,
            password,
            role
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          alert('User created successfully!');
          
          // Close modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
          modal.hide();
          
          // Reset form
          document.getElementById('addUserForm').reset();
          
          // Refresh user management
          loadUserManagement();
        } else {
          alert(data.message || 'Failed to create user');
        }
      } catch (error) {
        console.error('Error creating user:', error);
        alert('Failed to create user');
      }
    }
    
    // Toggle password visibility
    document.getElementById('togglePassword').addEventListener('click', function() {
      const passwordInput = document.getElementById('userPassword');
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Toggle the eye icon
      const icon = this.querySelector('i');
      icon.classList.toggle('bi-eye');
      icon.classList.toggle('bi-eye-slash');
    });
    
    // Function to save loan settings
    function saveLoanSettings(event) {
      event.preventDefault();
      
      const maxLoanAmount = document.getElementById('maxLoanAmount').value;
      const maxDuration = document.getElementById('maxDuration').value;
      
      // Implementation would save these to the backend
      alert('Loan settings saved successfully!');
    }
    
    // Function to save notification settings
    function saveNotificationSettings(event) {
      event.preventDefault();
      
      const emailNotifications = document.getElementById('emailNotifications').checked;
      const smsNotifications = document.getElementById('smsNotifications').checked;
      
      // Implementation would save these to the backend
      alert('Notification settings saved successfully!');
    }
    
    // Helper function to get status badge class
    function getStatusClass(status) {
      switch(status) {
        case 'Approved': return 'bg-success';
        case 'Rejected': return 'bg-danger';
        case 'Pending': return 'bg-warning text-dark';
        case 'Pending Review': return 'bg-info';
        default: return 'bg-secondary';
      }
    }

    // Helper function to get a readable document type name
    function getDocumentType(category) {
      if (!category) return 'Document';
      
      switch(category.toLowerCase()) {
        case 'identity': return 'Identity Document';
        case 'address': return 'Address Proof';
        case 'financial': return 'Financial Record';
        default: return category.charAt(0).toUpperCase() + category.slice(1) + ' Document';
      }
    }
});