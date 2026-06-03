
// ──────────────────────────────────────────
// 12. DEPOIMENTOS CAROUSEL
// ──────────────────────────────────────────
let testimonialAutoplay = null;
let testimonialIndex = 0;

function initTestimonialCarousel() {
  const track = document.querySelector('.testimonials-track');
  const prevBtn = document.querySelector('.testimonial-nav.prev');
  const nextBtn = document.querySelector('.testimonial-nav.next');
  const cards = document.querySelectorAll('.testimonial-card');
  
  if (!track || !prevBtn || !nextBtn || !cards.length) return;
  
  function updateButtons() {
    prevBtn.disabled = testimonialIndex <= 0;
    nextBtn.disabled = testimonialIndex >= cards.length - 1;
  }
  
  function scrollToIndex(index) {
    testimonialIndex = Math.max(0, Math.min(index, cards.length - 1));
    const card = cards[testimonialIndex];
    const scrollLeft = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    updateButtons();
  }
  
  function getActiveIndex() {
    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    return Array.from(cards).reduce((closest, card, idx) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const diff = Math.abs(trackCenter - cardCenter);
      const closestCard = cards[closest];
      const closestDiff = Math.abs(trackCenter - (closestCard.offsetLeft + closestCard.clientWidth / 2));
      return diff < closestDiff ? idx : closest;
    }, 0);
  }
  
  function startAutoplay() {
    if (testimonialAutoplay) return;
    testimonialAutoplay = setInterval(() => {
      const nextIndex = testimonialIndex < cards.length - 1 ? testimonialIndex + 1 : 0;
      scrollToIndex(nextIndex);
    }, 5000);
  }
  
  function stopAutoplay() {
    if (testimonialAutoplay) {
      clearInterval(testimonialAutoplay);
      testimonialAutoplay = null;
    }
  }
  
  prevBtn.addEventListener('click', () => {
    scrollToIndex(testimonialIndex - 1);
    stopAutoplay();
    startAutoplay();
  });
  
  nextBtn.addEventListener('click', () => {
    scrollToIndex(testimonialIndex + 1);
    stopAutoplay();
    startAutoplay();
  });
  
  track.addEventListener('scroll', () => {
    testimonialIndex = getActiveIndex();
    updateButtons();
  });
  
  track.addEventListener('mouseenter', stopAutoplay);
  track.addEventListener('mouseleave', startAutoplay);
  window.addEventListener('resize', () => scrollToIndex(testimonialIndex));
  
  updateButtons();
  startAutoplay();
}
