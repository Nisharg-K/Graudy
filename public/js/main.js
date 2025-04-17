
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
      });
    }
    
    // Mobile menu toggle
    const mobileMenuToggle = document.createElement('button');
    mobileMenuToggle.className = 'mobile-menu-toggle';
    mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    
    const header = document.querySelector('.header');
    if (header) {
      header.prepend(mobileMenuToggle);
      
      mobileMenuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('show');
      });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
      const isClickInsideSidebar = sidebar && sidebar.contains(event.target);
      const isClickOnMenuToggle = event.target === mobileMenuToggle || mobileMenuToggle.contains(event.target);
      
      if (sidebar && sidebar.classList.contains('show') && !isClickInsideSidebar && !isClickOnMenuToggle) {
        sidebar.classList.remove('show');
      }
    });
    
    // Theme handling
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Add animation effects to cards
    const animateOnScroll = () => {
      const cards = document.querySelectorAll('.card-animation');
      cards.forEach(card => {
        const cardTop = card.getBoundingClientRect().top;
        const cardBottom = card.getBoundingClientRect().bottom;
        const windowHeight = window.innerHeight;
        
        if (cardTop < windowHeight && cardBottom > 0) {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }
      });
    };
    
    // Initial animation
    setTimeout(() => {
      const cards = document.querySelectorAll('.card-animation');
      cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      });
      
      animateOnScroll();
    }, 100);
    
    // Animate on scroll
    window.addEventListener('scroll', animateOnScroll);
    
    // Form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', function(event) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
          if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
            
            // Create error message if it doesn't exist
            let errorMessage = field.parentElement.querySelector('.error-message');
            if (!errorMessage) {
              errorMessage = document.createElement('div');
              errorMessage.className = 'error-message';
              errorMessage.textContent = 'This field is required';
              field.parentElement.appendChild(errorMessage);
            }
          } else {
            field.classList.remove('error');
            const errorMessage = field.parentElement.querySelector('.error-message');
            if (errorMessage) {
              errorMessage.remove();
            }
          }
        });
        
        if (!isValid) {
          event.preventDefault();
        }
      });
    });
    
    // Table row hover effects
    const tableRows = document.querySelectorAll('.data-table tbody tr');
    tableRows.forEach(row => {
      row.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = 'var(--shadow)';
      });
      
      row.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
      });
    });
    
    // Attendance form helper
    const attendanceForm = document.querySelector('form[action="/attendance/mark"]');
    if (attendanceForm) {
      const allPresentBtn = document.createElement('button');
      allPresentBtn.type = 'button';
      allPresentBtn.className = 'btn btn-sm btn-info mr-2';
      allPresentBtn.textContent = 'Mark All Present';
      
      const allAbsentBtn = document.createElement('button');
      allAbsentBtn.type = 'button';
      allAbsentBtn.className = 'btn btn-sm btn-secondary';
      allAbsentBtn.textContent = 'Mark All Absent';
      
      const formActions = attendanceForm.querySelector('.form-actions');
      if (formActions) {
        formActions.prepend(allAbsentBtn);
        formActions.prepend(allPresentBtn);
        
        allPresentBtn.addEventListener('click', function() {
          const statuses = attendanceForm.querySelectorAll('select[name^="attendance"]');
          statuses.forEach(select => {
            select.value = 'present';
          });
        });
        
        allAbsentBtn.addEventListener('click', function() {
          const statuses = attendanceForm.querySelectorAll('select[name^="attendance"]');
          statuses.forEach(select => {
            select.value = 'absent';
          });
        });
      }
    }
    
    // Add loading indicators to buttons
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(button => {
      button.addEventListener('click', function() {
        const form = this.closest('form');
        if (form && form.checkValidity()) {
          const originalText = this.innerHTML;
          this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
          this.disabled = true;
          
          setTimeout(() => {
            this.innerHTML = originalText;
            this.disabled = false;
          }, 3000); // Reset after timeout as fallback
        }
      });
    });
  });