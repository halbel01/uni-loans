// public/script.js
document.getElementById('registerForm').addEventListener('submit', async (event) => {
// Developing the capability of the 'registerForm' by adding an event listener
    event.preventDefault();
// Utilizing JavaScript for handling, avoiding standard submission behavior
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
// Retrieving the values of the email and password input fields

    const userId = document.getElementById('userId').value;
    const organization = document.getElementById('organization').value;
    const course = document.getElementById('course').value;
    const amount = document.getElementById('amount').value;

    console.log('Loan Application Data:', { userId, organization, course, amount });

    // To test without API, simulate server response
    alert('Loan application submitted successfully!');
  
    try {
      const response = await fetch('/register', {
// Declaring endpoint
        method: 'POST',
// Assigning type of method
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
// Creating a POST request to the server's '/register' endpoint

      const message = await response.text();
      alert(message);
// Outlining the return message from the server
    } catch (error) {
      console.error('Error:', error);
    }
  });

  document.getElementById('otpForm').addEventListener('submit', async (event) => {
    event.preventDefault();
  
    const otp = document.getElementById('otp').value;
  
    try {
      // Simulating OTP verification
      if (otp === '123456') { // Utilizing hard-code OTP for testing
        alert('OTP verified successfully! Registration complete.');
        window.location.href = '/dashboard'; // Redirect to the dashboard
      } else {
        alert('Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error during OTP verification:', error);
    }
  });



  




