document.addEventListener('DOMContentLoaded', function() {
  // Get user ID from local storage or session
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  if (userId) {
    document.getElementById('userId').value = userId;
    
    // Check if user already has financial data
    fetchExistingFinancialData(userId);
  } else {
    // If no user ID is found, redirect to login
    alert('You must be logged in to access this page');
    window.location.href = 'login.html';
  }
  
  // Handle form submission
  const financialDataForm = document.getElementById('financialDataForm');
  if (financialDataForm) {
    financialDataForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      const formData = new FormData();
      formData.append('userId', document.getElementById('userId').value);
      formData.append('annualIncome', document.getElementById('annualIncome').value);
      formData.append('familyIncome', document.getElementById('familyIncome').value);
      formData.append('outstandingDebts', document.getElementById('outstandingDebts').value);
      formData.append('assets', document.getElementById('assets').value);
      formData.append('additionalNotes', document.getElementById('additionalNotes').value);
      
      // Add document if selected
      const documentFile = document.getElementById('document').files[0];
      if (documentFile) {
        formData.append('document', documentFile);
      }
      
      try {
        // First submit financial data
        const financialResponse = await fetch('/financial/submit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            userId: document.getElementById('userId').value,
            annualIncome: parseFloat(document.getElementById('annualIncome').value),
            familyIncome: parseFloat(document.getElementById('familyIncome').value),
            outstandingDebts: parseFloat(document.getElementById('outstandingDebts').value),
            assets: parseFloat(document.getElementById('assets').value),
            additionalNotes: document.getElementById('additionalNotes').value
          })
        });
        
        const financialData = await financialResponse.json();
        
        // Then upload document if present
        if (documentFile) {
          const docFormData = new FormData();
          docFormData.append('document', documentFile);
          
          const docResponse = await fetch(`/financial/document/${document.getElementById('userId').value}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
            },
            body: docFormData
          });
          
          const docData = await docResponse.json();
          console.log('Document uploaded:', docData);
        }
        
        alert('Financial information submitted successfully!');
        window.location.href = 'dashboard.html';
      } catch (error) {
        console.error('Error submitting financial data:', error);
        alert('An error occurred while submitting your financial information. Please try again.');
      }
    });
  }
  
  // Function to fetch existing financial data
  async function fetchExistingFinancialData(userId) {
    try {
      const response = await fetch(`/financial/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.financialData) {
          // Populate form with existing data
          document.getElementById('annualIncome').value = data.financialData.annualIncome;
          document.getElementById('familyIncome').value = data.financialData.familyIncome;
          document.getElementById('outstandingDebts').value = data.financialData.outstandingDebts;
          document.getElementById('assets').value = data.financialData.assets;
          document.getElementById('additionalNotes').value = data.financialData.additionalNotes;
        }
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  }
}); 