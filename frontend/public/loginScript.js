document.addEventListener('DOMContentLoaded', function() {
  // Login form submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        // Send login request
        const response = await fetch('/otp/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Store email for OTP verification
          localStorage.setItem('tempLoginEmail', email);
          
          // If login successful, show OTP section
          document.getElementById('loginForm').style.display = 'none';
          document.getElementById('otpSection').style.display = 'block';
          alert(data.message || 'OTP sent to your email. Please verify to continue.');
        } else {
          // If login failed, show error
          alert(data.message || 'Login failed. Please check your credentials.');
        }
      } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred during login. Please try again.');
      }
    });
  }
  
  // OTP verification form
  const otpForm = document.getElementById('otpForm');
  if (otpForm) {
    otpForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      const email = localStorage.getItem('tempLoginEmail');
      const otp = document.getElementById('otp').value;
      
      if (!email) {
        alert('Session expired. Please login again.');
        window.location.reload();
        return;
      }
      
      try {
        // Send OTP verification request
        const response = await fetch('/otp/verify-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, otp })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Clear temporary email
          localStorage.removeItem('tempLoginEmail');
          
          // Store user data and token
          localStorage.setItem('token', data.token);
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('userEmail', data.email);
          localStorage.setItem('userName', `${data.firstName} ${data.lastName}`);
          localStorage.setItem('userRole', data.role);
          
          alert('Login successful!');
          
          // Redirect based on user role
          if (data.role === 'admin') {
            window.location.href = 'admin/dashboard.html';
          } else {
            window.location.href = 'dashboard.html';
          }
        } else {
          // If verification failed, show error
          alert(data.message || 'OTP verification failed. Please try again.');
        }
      } catch (error) {
        console.error('Error during OTP verification:', error);
        alert('An error occurred during verification. Please try again.');
      }
    });
  }
}); 