document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    if (!token || !userId) {
      alert('You must be logged in to view loan status');
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
      
      container.innerHTML = `
        <h3 class="card-title">Loan Application Details</h3>
        <div class="row mt-4">
          <div class="col-md-6">
            <p><strong>Application ID:</strong> ${loan._id}</p>
            <p><strong>Institution:</strong> ${loan.organization || loan.institution}</p>
            <p><strong>Course:</strong> ${loan.course}</p>
            <p><strong>Amount:</strong> £${loan.amount}</p>
          </div>
          <div class="col-md-6">
            <p><strong>Status:</strong> <span class="badge ${statusClass}">${loan.status}</span></p>
            <p><strong>Submission Date:</strong> ${new Date(loan.createdAt).toLocaleDateString()}</p>
            <p><strong>Purpose:</strong> ${loan.purpose || 'Not specified'}</p>
            <p><strong>Duration of Study:</strong> ${loan.studyDuration || 'Not specified'} year(s)</p>
          </div>
        </div>
        
        <div class="row mt-3">
          <div class="col-md-12">
            <div class="alert alert-info">
              <h5>Loan Summary</h5>
              <div class="row">
                <div class="col-md-4 text-center">
                  <p class="fw-bold mb-1">Original Amount</p>
                  <p class="fs-5">£${loan.amount}</p>
                </div>
                <div class="col-md-4 text-center">
                  <p class="fw-bold mb-1">Remaining Balance</p>
                  <p class="fs-5">£${loan.remainingBalance || loan.amount}</p>
                </div>
                <div class="col-md-4 text-center">
                  <p class="fw-bold mb-1">Interest Rate</p>
                  <p class="fs-5">0% (Interest-Free)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Show repayment section and payment section if loan is approved
      if (loan.status === 'Approved') {
        document.getElementById('repaymentSection').style.display = 'block';
        document.getElementById('makePaymentSection').style.display = 'block';
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
            <td>£${payment.amountPaid}</td>
            <td>${payment.paymentMethod || 'Not specified'}</td>
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