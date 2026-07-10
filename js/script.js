/*
 * Dora Ad Admin Panel 1™ - Vanilla JavaScript Engine
 * Fully Interactive features: View changes, filtering, modals, copy actions
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Dora Ad Admin Panel 1™ Loaded successfully');

  // Realistic Online Users count fluctuator
  const onlineCountEl = document.querySelector('.online-capsule span');
  if (onlineCountEl) {
    let baseCount = 882;
    setInterval(() => {
      const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
      baseCount += delta;
      if (baseCount > 850 && baseCount < 920) {
        onlineCountEl.textContent = `${baseCount} users online right now`;
      }
    }, 4000);
  }

  // Active view router simulation
  const homeView = document.getElementById('home-view-scrollable');
  const detailView = document.getElementById('service-detail-view');
  const backBtn = document.getElementById('back-to-home-btn');

  // Handle plan button clicking to simulate view change
  document.querySelectorAll('.plans-badge').forEach(badge => {
    badge.addEventListener('click', (e) => {
      const card = e.target.closest('.service-card');
      const serviceName = card.querySelector('h4').textContent.trim();
      const serviceSubtitle = card.querySelector('.service-subtitle').textContent.trim();
      const serviceIconSvg = card.querySelector('.service-img').innerHTML;

      // Update Detail Header
      const detailHeaderTitle = document.querySelector('#detail-app-header h2');
      const detailHeaderSubtitle = document.querySelector('#detail-app-header p');
      const detailHeaderIcon = document.querySelector('#detail-app-header .service-img');

      if (detailHeaderTitle) detailHeaderTitle.innerHTML = `${serviceName} <span class="verified-badge"><i class="fa-solid fa-check"></i></span>`;
      if (detailHeaderSubtitle) detailHeaderSubtitle.textContent = serviceSubtitle;
      if (detailHeaderIcon) detailHeaderIcon.innerHTML = serviceIconSvg;

      // Update the plans card names inside Detail view
      document.querySelectorAll('.plan-card h3').forEach(title => {
        title.innerHTML = `${serviceName} <span class="verified-badge"><i class="fa-solid fa-check"></i></span>`;
      });

      // Switch view smoothly
      if (homeView) homeView.style.display = 'none';
      if (detailView) {
        detailView.style.display = 'flex';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (detailView) detailView.style.display = 'none';
      if (homeView) {
        homeView.style.display = 'flex';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // Category filter selectors
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      filterPills.forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');

      const filterVal = e.target.textContent.trim();
      const planCards = document.querySelectorAll('.plan-card');

      planCards.forEach(card => {
        const durationTag = card.querySelector('.duration-tag').textContent.trim();
        if (filterVal === 'All' || durationTag === filterVal) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Modal Handlers
  const upiModal = document.getElementById('upi-modal-overlay');
  const whatsappModal = document.getElementById('whatsapp-modal-overlay');
  const supportModal = document.getElementById('support-modal-overlay');

  const closeBtns = document.querySelectorAll('.close-modal-btn');

  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (upiModal) upiModal.style.display = 'none';
      if (whatsappModal) whatsappModal.style.display = 'none';
      if (supportModal) supportModal.style.display = 'none';
    });
  });

  // Open Support
  const supportTrigger = document.getElementById('btn-customer-support');
  if (supportTrigger && supportModal) {
    supportTrigger.addEventListener('click', () => {
      supportModal.style.display = 'flex';
    });
  }

  // Open WhatsApp Channels
  const whatsappTrigger = document.getElementById('btn-whatsapp-group');
  if (whatsappTrigger && whatsappModal) {
    whatsappTrigger.addEventListener('click', () => {
      whatsappModal.style.display = 'flex';
    });
  }

  // Open Pay via UPI or Buy Now
  const openUpiPayment = (planName, price, oldPrice) => {
    if (!upiModal) return;

    // Update modal details
    const modalTitle = upiModal.querySelector('h5');
    const modalPrice = upiModal.querySelector('.plan-price');
    const modalOldPrice = upiModal.querySelector('.plan-old-price');

    if (modalTitle) modalTitle.textContent = planName;
    if (modalPrice) modalPrice.textContent = `₹${price}`;
    if (modalOldPrice) modalOldPrice.textContent = `₹${oldPrice}`;

    upiModal.style.display = 'flex';
  };

  const payTrigger = document.getElementById('btn-pay-upi');
  if (payTrigger) {
    payTrigger.addEventListener('click', () => {
      openUpiPayment('DRIPCLIENT PROXY NON ROOT PANEL', '250', '400');
    });
  }

  document.querySelectorAll('.btn-buy-now').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.plan-card');
      const planName = card.querySelector('h3').textContent.trim();
      const price = card.querySelector('.plan-price').textContent.trim().replace('₹', '');
      const oldPrice = card.querySelector('.plan-old-price').textContent.trim().replace('₹', '');

      openUpiPayment(planName, price, oldPrice);
    });
  });

  // Clipboard Copiers
  window.copyText = (text, btnId) => {
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById(btnId);
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span style="color:#10B981">Copied!</span>';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 1500);
      }
    });
  };
});
