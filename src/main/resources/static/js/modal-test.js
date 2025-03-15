// This is a temporary script to debug modal issues

document.addEventListener('DOMContentLoaded', function() {
  console.log('Modal test script loaded');
  
  // Check if Bootstrap is available
  if (typeof bootstrap !== 'undefined') {
    console.log('Bootstrap is available');
    
    // Check if enhanceBtn exists
    const enhanceBtn = document.getElementById('enhanceBtn');
    if (enhanceBtn) {
      console.log('Enhance button found');
      
      // Check if enhanceModal exists
      const enhanceModal = document.getElementById('enhanceModal');
      if (enhanceModal) {
        console.log('Enhance modal found');
      } else {
        console.error('Enhance modal not found');
      }
      
      // Add a direct click handler for testing
      enhanceBtn.addEventListener('click', function() {
        console.log('Enhance button clicked via test handler');
        
        try {
          const modal = new bootstrap.Modal(document.getElementById('enhanceModal'));
          modal.show();
          console.log('Modal show method called');
        } catch (error) {
          console.error('Error showing modal:', error);
        }
      });
    } else {
      console.error('Enhance button not found');
    }
  } else {
    console.error('Bootstrap is not available');
  }
});
