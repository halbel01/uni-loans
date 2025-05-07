document.getElementById('repaymentForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const loanId = document.getElementById('loanId').value;
    const amountPaid = document.getElementById('amountPaid').value;
// Getting the values that were put into the form.

    try {
      const response = await fetch('/loan/repay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, amountPaid }),
      });
// Providing the loan ID and repayment amount in a POST request to the server.
      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error('Error making repayment:', error);
// Preventing regular form submission behavior
    }
  });
  
  document.getElementById('historyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
// Managing repayment history form submission
    const loanId = document.getElementById('historyLoanId').value;
  
    try {
      const response = await fetch(`/loan/repayment-history/${loanId}`, {
        method: 'GET',
      });
  
      const data = await response.json();
      const resultsDiv = document.getElementById('historyResults');
  
      if (data.repaymentHistory && data.repaymentHistory.length > 0) {
        resultsDiv.innerHTML = `<h2>Repayment History:</h2>`;
        data.repaymentHistory.forEach((repayment) => {
          resultsDiv.innerHTML += `<p>Date: ${repayment.date}, Amount: ${repayment.amountPaid}</p>`;
// Displaying repayment history if it exists
        });
      } else {
        resultsDiv.innerHTML = `<p>No repayment history found.</p>`;
      }
    } catch (error) {
      console.error('Error fetching repayment history:', error);
    }
  });

  
  
  