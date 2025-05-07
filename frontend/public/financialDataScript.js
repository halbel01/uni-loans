document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  
  if (!token || !userId) {
    alert('You must be logged in to submit financial information');
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
  
  // Toggle existing loans section visibility
  document.querySelectorAll('input[name="existingLoans"]').forEach(radio => {
    radio.addEventListener('change', function() {
      const existingLoansSection = document.getElementById('existingLoansSection');
      
      if (this.value === 'true') {
        existingLoansSection.classList.remove('d-none');
        // Make fields required
        document.getElementById('loanType').required = true;
        document.getElementById('loanAmount').required = true;
        document.getElementById('monthlyPayment').required = true;
      } else {
        existingLoansSection.classList.add('d-none');
        // Remove required attribute
        document.getElementById('loanType').required = false;
        document.getElementById('loanAmount').required = false;
        document.getElementById('monthlyPayment').required = false;
      }
    });
  });
  
  // Check if financial data already exists for this user
  fetchExistingFinancialData();
  
  // Handle form submission
  const financialDataForm = document.getElementById('financialDataForm');
  financialDataForm.addEventListener('submit', function(event) {
    event.preventDefault();
    submitFinancialData();
  });
  
  // Function to fetch existing financial data
  async function fetchExistingFinancialData() {
    try {
      const response = await fetch(`/financial/user/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && Object.keys(data).length > 0) {
          // Populate form with existing data
          populateFormWithData(data);
        }
      } else if (response.status !== 404) {
        // 404 means no data exists yet, which is fine
        console.error('Error fetching financial data');
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  }
  
  // Function to populate form with existing data
  function populateFormWithData(data) {
    document.getElementById('incomeSource').value = data.incomeSource || '';
    document.getElementById('monthlyIncome').value = data.monthlyIncome || '';
    document.getElementById('additionalIncome').value = data.additionalIncome || '';
    document.getElementById('incomeProofType').value = data.incomeProofType || '';
    document.getElementById('monthlyExpenses').value = data.monthlyExpenses || '';
    document.getElementById('accommodationType').value = data.accommodationType || '';
    document.getElementById('accommodationCost').value = data.accommodationCost || '';
    
    // Set existing loans radio button
    if (data.existingLoans) {
      document.getElementById('existingLoansYes').checked = true;
      document.getElementById('existingLoansSection').classList.remove('d-none');
      
      // Populate loan details
      document.getElementById('loanType').value = data.loanType || '';
      document.getElementById('loanAmount').value = data.loanAmount || '';
      document.getElementById('monthlyPayment').value = data.monthlyPayment || '';
      
      // Make fields required
      document.getElementById('loanType').required = true;
      document.getElementById('loanAmount').required = true;
      document.getElementById('monthlyPayment').required = true;
    } else {
      document.getElementById('existingLoansNo').checked = true;
    }
    
    document.getElementById('bankName').value = data.bankName || '';
    document.getElementById('accountNumber').value = data.accountNumber || '';
    document.getElementById('sortCode').value = data.sortCode || '';
    document.getElementById('additionalInfo').value = data.additionalInfo || '';
  }
  
  // Function to submit financial data
  async function submitFinancialData() {
    // Calculate annual income from monthly income
    const monthlyIncome = parseFloat(document.getElementById('monthlyIncome').value);
    const annualIncome = monthlyIncome * 12;
    
    // Use annual income as family income if no separate field exists
    const familyIncome = annualIncome;
    
    // Collect form data
    const formData = {
      userId,
      // Add required fields from the model
      annualIncome,
      familyIncome,
      incomeSource: document.getElementById('incomeSource').value,
      monthlyIncome: monthlyIncome,
      additionalIncome: parseFloat(document.getElementById('additionalIncome').value) || 0,
      incomeProofType: document.getElementById('incomeProofType').value,
      monthlyExpenses: parseFloat(document.getElementById('monthlyExpenses').value),
      accommodationType: document.getElementById('accommodationType').value,
      accommodationCost: parseFloat(document.getElementById('accommodationCost').value),
      existingLoans: document.getElementById('existingLoansYes').checked,
      bankName: document.getElementById('bankName').value,
      accountNumber: document.getElementById('accountNumber').value,
      sortCode: document.getElementById('sortCode').value,
      additionalInfo: document.getElementById('additionalInfo').value,
      // Add these as they might be expected by the backend
      outstandingDebts: 0,
      assets: 0
    };
    
    // Add loan details if existingLoans is true
    if (formData.existingLoans) {
      formData.loanType = document.getElementById('loanType').value;
      formData.loanAmount = parseFloat(document.getElementById('loanAmount').value);
      formData.monthlyPayment = parseFloat(document.getElementById('monthlyPayment').value);
      // Use loan amount as outstanding debts if they exist
      formData.outstandingDebts = parseFloat(document.getElementById('loanAmount').value);
    }
    
    console.log("Submitting financial data:", formData);
    
    try {
      const response = await fetch('/financial/submit', {
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
        alert('Financial information submitted successfully!');
        window.location.href = 'dashboard.html';
      } else {
        alert(data.message || 'Error submitting financial information');
      }
    } catch (error) {
      console.error('Error submitting financial information:', error);
      alert('An error occurred while submitting your financial information. Please try again.');
    }
  }
}); 