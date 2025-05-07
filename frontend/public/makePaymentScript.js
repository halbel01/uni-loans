document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    if (!token || !userId) {
      alert('You must be logged in to make a payment');
      window.location.href = 'login.html';
      return;
    }
    
    // Get loan ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const loanId = urlParams.get('id');
    
    if (!loanId) {
      alert('No loan specified');
      window.location.href = 'dashboard.html';
      return;
    }
    
    // Set loan ID in hidden field
    document.getElementById('loanId').value = loanId;
    
    // Fetch loan details
    fetchLoanDetails(loanId);
    
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
    
    // Handle payment method change
    document.getElementById('paymentMethod').addEventListener('change', function() {
      const method = this.value;
      
      // Hide all payment method specific sections
      document.getElementById('cardDetailsSection').style.display = 'none';
      document.getElementById('bankTransferSection').style.display = 'none';
      
      // Show the relevant section based on the selected payment method
      if (method === 'debitCard' || method === 'creditCard') {
        document.getElementById('cardDetailsSection').style.display = 'block';
      } else if (method === 'bankTransfer') {
        document.getElementById('bankTransferSection').style.display = 'block';
        // Set unique reference for bank transfer
        document.getElementById('transferReference').textContent = `UL-${loanId.substring(0, 8)}`;
      }
    });
    
    // Handle payment form submission
    document.getElementById('paymentForm').addEventListener('submit', function(event) {
      event.preventDefault();
      processPayment();
    });
    
    // Functions
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
        } else {
          const errorData = await response.json();
          document.getElementById('loanDetailsContainer').innerHTML = `
            <div class="alert alert-danger">
              <h5>Error Loading Loan Details</h5>
              <p>${errorData.message || 'Failed to load loan details'}</p>
              <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
            </div>
          `;
          document.getElementById('paymentFormContainer').style.display = 'none';
        }
      } catch (error) {
        console.error('Error fetching loan details:', error);
        document.getElementById('loanDetailsContainer').innerHTML = `
          <div class="alert alert-danger">
            <h5>Error</h5>
            <p>An error occurred while loading loan details.</p>
            <p>Error: ${error.message}</p>
            <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
          </div>
        `;
        document.getElementById('paymentFormContainer').style.display = 'none';
      }
    }
    
    function displayLoanDetails(loan) {
      // Check if loan is eligible for payment
      if (loan.status !== 'Approved' && loan.status !== 'Repaid') {
        document.getElementById('loanDetailsContainer').innerHTML = `
          <div class="alert alert-warning">
            <h5>Payment Not Available</h5>
            <p>Payments can only be made on approved loans. This loan's status is "${loan.status}".</p>
            <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
          </div>
        `;
        document.getElementById('paymentFormContainer').style.display = 'none';
        return;
      }
      
      // If loan is already fully repaid
      if (loan.status === 'Repaid' || loan.remainingBalance <= 0) {
        document.getElementById('loanDetailsContainer').innerHTML = `
          <div class="alert alert-success">
            <h5>Loan Fully Repaid</h5>
            <p>Congratulations! This loan has been fully repaid. No further payments are required.</p>
            <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
          </div>
        `;
        document.getElementById('paymentFormContainer').style.display = 'none';
        return;
      }
      
      // Format loan status badge
      const statusClass = getStatusClass(loan.status);
      
      // No interest calculation
      const principalAmount = loan.amount;
      const interestRate = 0; // Interest-free
      const interestAmount = 0; // No interest
      const totalAmount = principalAmount; // Total equals principal
      
      // Calculate payment progress
      const paidAmount = totalAmount - loan.remainingBalance;
      const progressPercentage = Math.round((paidAmount / totalAmount) * 100);
      
      // Display the loan details
      document.getElementById('loanDetailsContainer').innerHTML = `
        <div class="card">
          <div class="card-header bg-light">
            <h3 class="card-title mb-0"><i class="bi bi-file-earmark-text"></i> Loan Details</h3>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h5>Loan Information</h5>
                <p><strong>Loan ID:</strong> ${loan._id}</p>
                <p><strong>Institution:</strong> ${loan.organization || 'N/A'}</p>
                <p><strong>Course:</strong> ${loan.course || 'N/A'}</p>
                <p><strong>Status:</strong> <span class="badge ${statusClass}">${loan.status}</span></p>
              </div>
              <div class="col-md-6">
                <h5>Payment Information</h5>
                <p><strong>Principal Amount:</strong> £${principalAmount.toLocaleString()}</p>
                <p><strong>Interest (0%):</strong> £0</p>
                <p><strong>Total Amount:</strong> £${principalAmount.toLocaleString()}</p>
                <p><strong>Remaining Balance:</strong> £${loan.remainingBalance.toLocaleString()}</p>
              </div>
            </div>
            
            <div class="mt-3">
              <h5>Repayment Progress</h5>
              <div class="progress" style="height: 25px;">
                <div class="progress-bar ${getProgressBarClass(progressPercentage)}" 
                     role="progressbar" 
                     style="width: ${progressPercentage}%;" 
                     aria-valuenow="${progressPercentage}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                  ${progressPercentage}% Repaid
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Set the max amount the user can pay
      const amountInput = document.getElementById('amountPaid');
      amountInput.max = loan.remainingBalance;
      amountInput.placeholder = `Enter amount (max £${loan.remainingBalance.toLocaleString()})`;
      
      // Update the helper text
      document.getElementById('maxAmountText').textContent = 
        `Enter the amount you wish to pay (maximum £${loan.remainingBalance.toLocaleString()}).`;
    }
    
    function getStatusClass(status) {
      switch(status) {
        case 'Approved': return 'bg-success';
        case 'Rejected': return 'bg-danger';
        case 'Pending': return 'bg-warning text-dark';
        case 'Pending Review': return 'bg-info';
        case 'Repaid': return 'bg-success';
        default: return 'bg-secondary';
      }
    }
    
    function getProgressBarClass(percentage) {
      if (percentage >= 100) return 'bg-success';
      if (percentage >= 75) return 'bg-info';
      if (percentage >= 50) return 'bg-primary';
      if (percentage >= 25) return 'bg-warning';
      return 'bg-danger';
    }
    
    async function processPayment() {
      const loanId = document.getElementById('loanId').value;
      const amountPaid = parseFloat(document.getElementById('amountPaid').value);
      const paymentMethod = document.getElementById('paymentMethod').value;
      
      // Basic validation
      if (!amountPaid || amountPaid <= 0) {
        alert('Please enter a valid payment amount');
        return;
      }
      
      if (!paymentMethod) {
        alert('Please select a payment method');
        return;
      }
      
      // Additional validation for card payments
      if ((paymentMethod === 'debitCard' || paymentMethod === 'creditCard') && 
          document.getElementById('cardDetailsSection').style.display === 'block') {
        
        const cardNumber = document.getElementById('cardNumber').value;
        const expiryDate = document.getElementById('expiryDate').value;
        const cvv = document.getElementById('cvv').value;
        const cardholderName = document.getElementById('cardholderName').value;
        
        if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
          alert('Please fill in all card details');
          return;
        }
      }
      
      // Disable the submit button and show loading state
      const submitButton = document.getElementById('confirmPaymentBtn');
      const originalButtonText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Processing Payment...
      `;
      
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
          // Show success receipt
          showPaymentReceipt(data, amountPaid, paymentMethod);
          // Hide the payment form
          document.getElementById('paymentFormContainer').style.display = 'none';
        } else {
          // Re-enable the button
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonText;
          // Show error message
          alert(data.message || 'Error processing payment');
        }
      } catch (error) {
        console.error('Error making payment:', error);
        // Re-enable the button
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
        // Show error message
        alert('An error occurred while processing your payment. Please try again.');
      }
    }
    
    function showPaymentReceipt(data, amountPaid, paymentMethod) {
      const receiptContainer = document.getElementById('paymentReceiptContainer');
      const receiptNumber = data.loan.receiptNumber || generateReceiptNumber();
      const paymentDate = new Date().toLocaleDateString();
      const formattedPaymentMethod = formatPaymentMethod(paymentMethod);
      
      receiptContainer.innerHTML = `
        <div class="card border-success mb-4">
          <div class="card-header bg-success text-white">
            <h3 class="mb-0"><i class="bi bi-check-circle"></i> Payment Successful</h3>
          </div>
          <div class="card-body">
            <div class="text-center mb-4">
              <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
              <h4 class="mt-3">Your payment of £${amountPaid.toLocaleString()} has been processed successfully</h4>
            </div>
            
            <div class="row">
              <div class="col-md-6">
                <h5>Payment Details</h5>
                <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
                <p><strong>Payment Date:</strong> ${paymentDate}</p>
                <p><strong>Payment Method:</strong> ${formattedPaymentMethod}</p>
                <p><strong>Amount Paid:</strong> £${amountPaid.toLocaleString()}</p>
              </div>
              <div class="col-md-6">
                <h5>Loan Information</h5>
                <p><strong>Loan ID:</strong> ${data.loan._id}</p>
                <p><strong>Remaining Balance:</strong> £${data.loan.remainingBalance.toLocaleString()}</p>
                <p><strong>Status:</strong> ${data.loan.status === 'Repaid' ? 'Fully Repaid' : 'Partially Repaid'}</p>
              </div>
            </div>
            
            ${data.loan.status === 'Repaid' ? `
            <div class="alert alert-success mt-3">
              <h5><i class="bi bi-trophy"></i> Congratulations!</h5>
              <p class="mb-0">You have fully repaid your loan. No further payments are required.</p>
            </div>
            <p class="mt-2">
              <a href="loan-receipt.html?id=${data.loan._id}" class="btn btn-outline-success">
                <i class="bi bi-award"></i> View Repayment Certificate
              </a>
            </p>
            ` : ''}
            
            <div class="alert alert-info mt-3">
              <p class="mb-0">A receipt has been sent to your registered email address.</p>
            </div>
            
            <div class="d-grid gap-2 mt-4">
              <a href="dashboard.html" class="btn btn-primary">
                <i class="bi bi-house"></i> Back to Dashboard
              </a>
              <button class="btn btn-outline-secondary" onclick="window.print()">
                <i class="bi bi-printer"></i> Print Receipt
              </button>
            </div>
          </div>
        </div>
      `;
      
      receiptContainer.style.display = 'block';
    }
    
    function formatPaymentMethod(method) {
      if (!method) return 'Not specified';
      
      // Convert camelCase to Title Case with spaces
      return method
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
    }
    
    function generateReceiptNumber() {
      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `RCPT-${timestamp}-${random}`;
    }
  });