// Smooth scrolling for nav links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    target.scrollIntoView({
      behavior: 'smooth',
    });
  });
});

// Scroll tracker functionality
const trackerCircles = document.querySelectorAll('.tracker-circle');
const sections = document.querySelectorAll('section');

let isSnapping = false; // Flag to prevent scroll conflict

// Highlight the active tracker circle during scrolling
window.addEventListener('scroll', () => {
  if (isSnapping) return; // Prevent snapping during programmatic scrolling

  let currentSection = '';

  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;

    if (window.scrollY >= sectionTop - sectionHeight / 2) {
      currentSection = section.getAttribute('id');
    }
  });

  trackerCircles.forEach(circle => {
    circle.classList.remove('active');
    if (circle.getAttribute('data-target') === `#${currentSection}`) {
      circle.classList.add('active');
    }
  });
});


// Snap scrolling functionality
window.addEventListener('scroll', () => {
  if (isSnapping) return; // Prevent multiple triggers
  isSnapping = true;

  setTimeout(() => {
    const scrollPosition = window.scrollY;
    let closestSection = sections[0];

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (Math.abs(scrollPosition - sectionTop) < Math.abs(scrollPosition - closestSection.offsetTop)) {
        closestSection = section;
      }
    });

    // Scroll to the closest section
    closestSection.scrollIntoView({
      behavior: 'smooth',
    });

    // Allow natural scrolling again
    setTimeout(() => (isSnapping = false), 500); // Delay matches smooth scroll duration
  }, 200); // Debounce to prevent over-triggering
});


// Click functionality for tracker circles
trackerCircles.forEach(circle => {
  circle.addEventListener('click', function () {
    isSnapping = true; // Prevent conflicts during snapping
    const target = document.querySelector(this.getAttribute('data-target'));
    target.scrollIntoView({
      behavior: 'smooth',
    });

    setTimeout(() => (isSnapping = false), 500); // Reset after smooth scroll
  });
});



// PAGE 1

document.addEventListener('DOMContentLoaded', () => {
  // Select the target section for Page 1
  const page1 = document.querySelector('#page1');

  // Create the link element for the CSS file
  const page1CSS = document.createElement('link');
  page1CSS.rel = 'stylesheet';
  page1CSS.href = 'page1.css'; // Path to your CSS file
  page1CSS.id = 'page1-css'; // Unique ID to manage this stylesheet

  // Intersection Observer to detect when Page 1 is in view
  const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
          if (entry.isIntersecting) {
              // If Page 1 is in view, append the CSS
              if (!document.querySelector('#page1-css')) {
                  document.head.appendChild(page1CSS);
              }
          } else {
              // If Page 1 is out of view, remove the CSS
              const existingCSS = document.querySelector('#page1-css');
              if (existingCSS) {
                  existingCSS.remove();
              }
          }
      });
  });

  // Start observing Page 1
  observer.observe(page1);
});
