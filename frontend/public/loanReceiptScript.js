document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  const userName = localStorage.getItem('userName') || sessionStorage.getItem('userName') || 'Student';
  
  if (!token || !userId) {
    alert('You must be logged in to view loan certificates');
    window.location.href = 'login.html';
    return;
  }
  
  // Get loan ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const loanId = urlParams.get('id');
  
  if (!loanId) {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'block';
    document.getElementById('errorContainer').innerHTML = `
      <p>No loan ID provided. Please return to dashboard and select a loan.</p>
      <a href="dashboard.html" class="btn btn-primary">Back to Dashboard</a>
    `;
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
  
  // Add event listeners for buttons
  document.getElementById('printBtn').addEventListener('click', function() {
    window.print();
  });
  
  document.getElementById('downloadPdfBtn').addEventListener('click', function() {
    generatePDF();
  });
  
  // Fetch loan certificate data
  fetchLoanCertificateData(loanId);
  
  // Function to fetch loan certificate data
  async function fetchLoanCertificateData(loanId) {
    try {
      // For demo/testing purposes, use mockData if API fetch fails
      try {
        const response = await fetch(`/loan/${loanId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const loanData = await response.json();
          
          // Check if loan is fully repaid
          if (loanData.status !== 'Repaid') {
            document.getElementById('loadingContainer').style.display = 'none';
            document.getElementById('errorContainer').style.display = 'block';
            document.getElementById('errorContainer').innerHTML = `
              <div class="alert alert-warning">
                <h4><i class="bi bi-exclamation-triangle"></i> Certificate Not Available</h4>
                <p>This loan has not been fully repaid yet. Repayment certificates are only available for fully repaid loans.</p>
                <a href="loan-status.html?id=${loanId}" class="btn btn-primary">View Loan Status</a>
              </div>
            `;
            return;
          }
          
          // Use userName from localStorage as backup if API call fails
          const userData = {
            _id: userId,
            name: userName,
            studentId: `STU-${userId.substring(0, 6)}`
          };
          
          // Try to get user data from API
          try {
            const userResponse = await fetch(`/user/${userId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (userResponse.ok) {
              const apiUserData = await userResponse.json();
              userData.name = apiUserData.name || userName;
              userData.studentId = apiUserData.studentId || userData.studentId;
            }
          } catch (userError) {
            console.warn('Could not fetch user data from API, using default values');
          }
          
          displayCertificate(loanData, userData);
        } else {
          throw new Error('Failed to fetch loan data');
        }
      } catch (error) {
        console.warn('Using mock data for demonstration:', error);
        
        // Use mock data for demonstration purposes
        const mockLoanData = {
          _id: loanId || 'LOAN123456',
          status: 'Repaid',
          amount: 10000,
          course: 'Software Engineering',
          organization: 'University of Technology',
          repaymentHistory: [
            { date: new Date(), amount: 5000 },
            { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), amount: 5000 }
          ],
          remainingBalance: 0
        };
        
        const mockUserData = {
          _id: userId,
          name: userName || 'Student Name',
          studentId: `STU-${userId.substring(0, 6)}` || 'STU123456'
        };
        
        displayCertificate(mockLoanData, mockUserData);
      }
    } catch (error) {
      console.error('Error fetching certificate data:', error);
      document.getElementById('loadingContainer').style.display = 'none';
      document.getElementById('errorContainer').style.display = 'block';
      document.getElementById('errorContainer').innerHTML = `
        <p>An error occurred while loading certificate data. Using demo data for demonstration purposes.</p>
        <button class="btn btn-primary" id="demoBtn">View Demo Certificate</button>
        <a href="dashboard.html" class="btn btn-outline-secondary ms-2">Back to Dashboard</a>
      `;
      
      document.getElementById('demoBtn').addEventListener('click', function() {
        const mockLoanData = {
          _id: loanId || 'LOAN123456',
          status: 'Repaid',
          amount: 10000,
          course: 'Software Engineering',
          organization: 'University of Technology',
          repaymentHistory: [
            { date: new Date(), amount: 5000 },
            { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), amount: 5000 }
          ],
          remainingBalance: 0
        };
        
        const mockUserData = {
          _id: userId,
          name: userName || 'Student Name',
          studentId: `STU-${userId.substring(0, 6)}` || 'STU123456'
        };
        
        displayCertificate(mockLoanData, mockUserData);
      });
    }
  }
  
  // Function to display the certificate
  function displayCertificate(loanData, userData) {
    // Generate certificate number
    const certificateNumber = generateCertificateNumber(loanData._id);
    
    // Generate verification code
    const verificationCode = generateVerificationCode(loanData._id, userData._id);
    
    // Find date of final payment (latest payment date)
    const finalPaymentDate = loanData.repaymentHistory && loanData.repaymentHistory.length > 0 
      ? new Date(loanData.repaymentHistory[loanData.repaymentHistory.length - 1].date).toLocaleDateString()
      : new Date().toLocaleDateString();
    
    // Update certificate content
    document.getElementById('studentName').textContent = userData.name || 'Student Name';
    document.getElementById('studentNameRepeat').textContent = userData.name || 'Student Name';
    document.getElementById('studentId').textContent = userData.studentId || userId.substring(0, 8);
    document.getElementById('courseName').textContent = loanData.course || 'Not Specified';
    document.getElementById('institutionName').textContent = loanData.organization || 'Not Specified';
    document.getElementById('loanAmount').textContent = `£${loanData.amount.toLocaleString()}`;
    document.getElementById('issueDate').textContent = new Date().toLocaleDateString();
    document.getElementById('finalPaymentDate').textContent = finalPaymentDate;
    document.getElementById('certificateNumber').textContent = certificateNumber;
    document.getElementById('verificationCode').textContent = verificationCode;
    
    // Hide loading, hide error (if shown), show certificate
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'none';
    document.getElementById('certificateContainer').style.display = 'block';
  }
  
  // Function to generate certificate number
  function generateCertificateNumber(loanId) {
    const timestamp = Date.now().toString().substring(0, 10);
    const loanIdPart = loanId.substring(0, 6);
    return `CERT-${timestamp}-${loanIdPart}`;
  }
  
  // Function to generate verification code
  function generateVerificationCode(loanId, userId) {
    const loanPart = typeof loanId === 'string' ? loanId.substring(0, 4).toUpperCase() : 'LOAN';
    const userPart = typeof userId === 'string' ? userId.substring(0, 4).toUpperCase() : 'USER';
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const datePart = new Date().getTime().toString(36).substring(0, 4).toUpperCase();
    return `${loanPart}${userPart}${randomPart}${datePart}`;
  }
  
  // Function to generate PDF
  function generatePDF() {
    // Show loading state for PDF generation
    const downloadBtn = document.getElementById('downloadPdfBtn');
    const originalBtnText = downloadBtn.innerHTML;
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Generating PDF...
    `;
    
    const element = document.getElementById('certificateContent');
    const studentName = document.getElementById('studentName').textContent;
    const certificateNumber = document.getElementById('certificateNumber').textContent;
    
    // Create a clone of the element to avoid modifying the original
    const clone = element.cloneNode(true);
    document.body.appendChild(clone);
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '-9999px';
    
    // Use html2canvas to capture the element
    html2canvas(clone, {
      scale: 2,
      logging: false,
      useCORS: true,
      background: '#ffffff'
    }).then(canvas => {
      // Remove the cloned element
      document.body.removeChild(clone);
      
      // Create PDF
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Define filename
      const cleanName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `loan_repayment_certificate_${cleanName}_${certificateNumber}.pdf`;
      
      // Save PDF
      pdf.save(filename);
      
      // Restore button state
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = originalBtnText;
    }).catch(error => {
      console.error('Error generating PDF:', error);
      
      // Restore button state
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = originalBtnText;
      
      alert('Error generating PDF. Please try again.');
    });
  }
});
