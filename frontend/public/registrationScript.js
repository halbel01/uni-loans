document.addEventListener('DOMContentLoaded', function() {
  const registrationForm = document.getElementById('registrationForm');
  const otpForm = document.getElementById('otpForm');
  let userEmail = '';

  if (registrationForm) {
    registrationForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      // Password validation
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }
      
      if (password.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
      }
      
      // Collect form data
      const userData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        password: password
      };
      
      userEmail = userData.email;
      
      try {
        const response = await fetch('/user/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Show OTP form and hide registration form
          registrationForm.style.display = 'none';
          otpForm.style.display = 'block';
          alert(data.message || 'Registration successful! Please verify your email.');
        } else {
          alert(data.message || 'Registration failed. Please try again.');
        }
      } catch (error) {
        console.error('Error during registration:', error);
        alert('An error occurred during registration. Please try again.');
      }
    });
  }
  
  if (otpForm) {
    otpForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      const otpValue = document.getElementById('otp').value;
      
      try {
        const response = await fetch('/otp/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: userEmail,
            otp: otpValue
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          alert('Account verified successfully!');
          window.location.href = 'login.html'; // Redirect to login page
        } else {
          alert(data.message || 'OTP verification failed. Please try again.');
        }
      } catch (error) {
        console.error('Error during OTP verification:', error);
        alert('An error occurred during verification. Please try again.');
      }
    });
  }
});
