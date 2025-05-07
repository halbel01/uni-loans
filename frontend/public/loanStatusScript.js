document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  
  if (!token || !userId) {
    alert('You must be logged in to view loan status');
    window.location.href = 'login.html';
    return;
  }
  
  // Get loan ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const loanId = urlParams.get('id');
  
  if (!loanId) {
    document.getElementById('loanDetailsContainer').innerHTML = `
      <div class="alert alert-danger">
        <p>No loan ID provided. Please return to dashboard and select a loan.</p>
        <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
      </div>
    `;
    return;
  }
  
  // Set hidden loanId field for payment form
  document.getElementById('loanId').value = loanId;
  
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
  
  // Fetch loan details
  fetchLoanDetails(loanId);
  
  // Handle payment form submission
  const makePaymentForm = document.getElementById('makePaymentForm');
  makePaymentForm.addEventListener('submit', function(event) {
    event.preventDefault();
    makePayment();
  });
  
  // Function to fetch loan details
  async function fetchLoanDetails(loanId) {
    try {
      const response = await fetch(`/loan/${loanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const loan = await response.json();
        displayLoanDetails(loan);
        fetchRepaymentHistory(loanId);
      } else {
        const data = await response.json();
        document.getElementById('loanDetailsContainer').innerHTML = `
          <div class="alert alert-danger">
            <p>${data.message || 'Failed to load loan details'}</p>
            <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
      document.getElementById('loanDetailsContainer').innerHTML = `
        <div class="alert alert-danger">
          <p>An error occurred while loading loan details. Please try again.</p>
          <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
        </div>
      `;
    }
  }
  
  // Function to display loan details
  function displayLoanDetails(loan) {
    const container = document.getElementById('loanDetailsContainer');
    const statusClass = getStatusClass(loan.status);
    
    // No interest since loans are interest-free
    const interestAmount = 0; // No interest
    const totalAmount = loan.amount; // Total equals principal
    
    container.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <h4>Loan Information</h4>
          <p><strong>Loan ID:</strong> ${loan._id}</p>
          <p><strong>Institution/Organization:</strong> ${loan.organization}</p>
          <p><strong>Course:</strong> ${loan.course}</p>
          <p><strong>Purpose:</strong> ${loan.purpose || 'Not specified'}</p>
          <p><strong>Status:</strong> <span class="badge ${statusClass}">${loan.status}</span></p>
        </div>
        <div class="col-md-6">
          <h4>Financial Details</h4>
          <p><strong>Principal Amount:</strong> £${loan.amount.toLocaleString()}</p>
          <p><strong>Interest:</strong> £0 (0% - Interest-Free)</p>
          <p><strong>Total Amount:</strong> £${loan.amount.toLocaleString()}</p>
          <p><strong>Remaining Balance:</strong> £${loan.remainingBalance.toLocaleString()}</p>
          <p><strong>Application Date:</strong> ${new Date(loan.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      
      ${loan.adminNotes ? `
      <div class="row mt-3">
        <div class="col-12">
          <div class="alert alert-info">
            <h5>Admin Notes:</h5>
            <p>${loan.adminNotes}</p>
          </div>
        </div>
      </div>
      ` : ''}
      
      <div class="row mt-3">
        <div class="col-12">
          <div class="progress" style="height: 25px;">
            ${getProgressBar(loan)}
          </div>
        </div>
      </div>
    `;
    
    // Helper function to safely show/hide elements
    const safelySetDisplayStyle = (elementId, displayValue) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = displayValue;
      }
    };
    
    // Show repayment section for all loans except rejected ones
    if (loan.status !== 'Rejected') {
      safelySetDisplayStyle('repaymentSection', 'block');
    } else {
      safelySetDisplayStyle('repaymentSection', 'none');
    }
    
    // Show payment section only for approved loans
    if (loan.status === 'Approved') {
      safelySetDisplayStyle('makePaymentSection', 'block');
      // Set the loan ID in the hidden field
      const loanIdField = document.getElementById('loanId');
      if (loanIdField) {
        loanIdField.value = loan._id;
      }
      // Set max amount for payment
      const amountPaidField = document.getElementById('amountPaid');
      if (amountPaidField) {
        amountPaidField.max = loan.remainingBalance;
      }
    } else {
      safelySetDisplayStyle('makePaymentSection', 'none');
    }
    
    // Show certificate section for repaid loans
    if (loan.status === 'Repaid') {
      const certificateSection = document.getElementById('certificateSection');
      const certificateLink = document.getElementById('certificateLink');
      
      if (certificateSection) {
        certificateSection.style.display = 'block';
      }
      
      if (certificateLink) {
        certificateLink.href = `loan-receipt.html?id=${loan._id}`;
      }
    } else {
      safelySetDisplayStyle('certificateSection', 'none');
    }
    
    // Show rejection reason section for rejected loans
    if (loan.status === 'Rejected') {
      const rejectionSection = document.getElementById('rejectionSection');
      const rejectionReason = document.getElementById('rejectionReason');
      const contactSupportBtn = document.getElementById('contactSupportBtn');
      
      if (rejectionSection && rejectionReason) {
        // Check if there are admin notes (rejection reason)
        if (loan.adminNotes && loan.adminNotes.trim() !== '') {
          rejectionReason.textContent = loan.adminNotes;
        } else {
          rejectionReason.textContent = 'No specific reason provided. Please contact the financial aid office for more information.';
        }
        
        // Show the rejection section
        rejectionSection.style.display = 'block';
        
        // Add event listener to contact support button
        if (contactSupportBtn) {
          contactSupportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Open contact support modal or redirect to support page
            alert('You will be redirected to the support page. This feature is coming soon.');
          });
        }
      }
    } else {
      safelySetDisplayStyle('rejectionSection', 'none');
    }
  }
  
  // Function to get status badge class
  function getStatusClass(status) {
    switch(status) {
      case 'Approved': return 'bg-success';
      case 'Rejected': return 'bg-danger';
      case 'Pending': return 'bg-warning text-dark';
      case 'Pending Review': return 'bg-info';
      default: return 'bg-secondary';
    }
  }
  
  // Function to create a progress bar
  function getProgressBar(loan) {
    // Use totalAmountWithInterest if available, otherwise just use principal amount (no interest)
    const totalAmount = loan.totalAmountWithInterest || loan.amount;
    const paidAmount = totalAmount - loan.remainingBalance;
    const progressPercentage = (paidAmount / totalAmount) * 100;
    
    // Add different colors based on payment progress
    let bgColor = 'bg-primary';
    if (progressPercentage >= 100) {
      bgColor = 'bg-success';
    } else if (progressPercentage >= 75) {
      bgColor = 'bg-info';
    } else if (progressPercentage >= 50) {
      bgColor = 'bg-primary';
    } else if (progressPercentage >= 25) {
      bgColor = 'bg-warning';
    } else {
      bgColor = 'bg-danger';
    }
    
    return `
      <div class="progress-bar ${bgColor}" role="progressbar" 
           style="width: ${progressPercentage}%;" 
           aria-valuenow="${progressPercentage}" 
           aria-valuemin="0" 
           aria-valuemax="100">
        ${Math.round(progressPercentage)}% Repaid
      </div>
    `;
  }
  
  // Function to fetch repayment history
  async function fetchRepaymentHistory(loanId) {
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
        displayRepaymentHistory(data.repaymentHistory || []);
      } else {
        document.getElementById('repaymentHistoryContainer').innerHTML = `
          <p class="text-center">Failed to load repayment history.</p>
        `;
      }
    } catch (error) {
      console.error('Error fetching repayment history:', error);
      document.getElementById('repaymentHistoryContainer').innerHTML = `
        <p class="text-center">An error occurred while loading repayment history.</p>
      `;
    }
  }
  
  // Function to display repayment history
  function displayRepaymentHistory(repaymentHistory) {
    const container = document.getElementById('repaymentHistoryContainer');
    
    if (repaymentHistory.length === 0) {
      container.innerHTML = `
        <p class="text-center">No repayments have been made yet.</p>
      `;
      return;
    }
    
    let html = `
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount Paid</th>
              <th>Method</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    repaymentHistory.forEach(payment => {
      html += `
        <tr>
          <td>${new Date(payment.date).toLocaleDateString()}</td>
          <td>£${payment.amountPaid.toLocaleString()}</td>
          <td>${formatPaymentMethod(payment.paymentMethod) || 'Not specified'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary">
              <i class="bi bi-file-earmark-text"></i> View Receipt
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
  }
  
  // Format payment method for display
  function formatPaymentMethod(method) {
    if (!method) return 'Not specified';
    
    // Convert camelCase to Title Case with spaces
    const formatted = method
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
    
    return formatted;
  }
  
  // Function to make a payment
  async function makePayment() {
    const loanId = document.getElementById('loanId').value;
    const amountPaid = parseFloat(document.getElementById('amountPaid').value);
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    if (!amountPaid || amountPaid <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    
    try {
      const response = await fetch('/loan/repay', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          loanId,
          amountPaid,
          paymentMethod
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Payment successful!');
        // Reset form
        document.getElementById('amountPaid').value = '';
        document.getElementById('paymentMethod').value = '';
        // Refresh loan details and repayment history
        fetchLoanDetails(loanId);
      } else {
        alert(data.message || 'Error processing payment');
      }
    } catch (error) {
      console.error('Error making payment:', error);
      alert('An error occurred while processing your payment. Please try again.');
    }
  }
}); 