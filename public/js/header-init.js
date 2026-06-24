document.addEventListener('DOMContentLoaded', function () {
  const authNav = document.getElementById('auth-nav');
  const cartBadge = document.getElementById('cart-badge');
  const ordersLink = document.getElementById('orders-link');

  if (authNav) {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      let html = '';
      if (Auth.isAdmin()) {
        html += '<a href="/admin/products" class="text-bh-white hover:text-bh-yellow text-xs font-bold tracking-widest uppercase">後台管理</a>';
      }
      html += '<span class="text-bh-white text-xs font-bold tracking-widest uppercase">' + (user?.name || '') + '</span>';
      html += '<button onclick="Auth.logout()" class="text-bh-white hover:text-bh-yellow text-xs font-bold tracking-widest uppercase transition-colors">登出</button>';
      authNav.innerHTML = html;
    } else {
      authNav.innerHTML = '<a href="/login" class="bg-bh-red text-bh-white px-5 py-1.5 hover:bg-bh-white hover:text-bh-black transition-colors">登入</a>';
    }
  }

  if (ordersLink) {
    ordersLink.style.display = Auth.isLoggedIn() ? '' : 'none';
  }

  if (cartBadge) {
    apiFetch('/api/cart').then(function (res) {
      if (res && res.data && res.data.items && res.data.items.length > 0) {
        cartBadge.textContent = res.data.items.length;
        cartBadge.style.display = 'flex';
      }
    }).catch(function () {});
  }
});
