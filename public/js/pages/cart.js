const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    const items = ref([]);
    const loading = ref(true);
    const confirmVisible = ref(false);
    const deleteItemId = ref('');
    const shippingFee = ref(0);
    const grandTotal = ref(0);
    const freeShippingThreshold = ref(1500);

    const total = computed(function () {
      return items.value.reduce(function (sum, item) {
        return sum + item.product.price * item.quantity;
      }, 0);
    });

    async function refreshCart() {
      const res = await apiFetch('/api/cart');
      items.value = res.data.items;
      shippingFee.value = res.data.shipping_fee;
      grandTotal.value = res.data.grand_total;
      freeShippingThreshold.value = res.data.free_shipping_threshold;
    }

    async function loadCart() {
      loading.value = true;
      try {
        await refreshCart();
      } catch (e) {
        Notification.show('載入購物車失敗', 'error');
      } finally {
        loading.value = false;
      }
    }

    async function updateQuantity(itemId, qty) {
      if (qty < 1) return;
      try {
        await apiFetch('/api/cart/' + itemId, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: qty })
        });
        await refreshCart();
      } catch (e) {
        Notification.show('更新數量失敗', 'error');
      }
    }

    function confirmDelete(itemId) {
      deleteItemId.value = itemId;
      confirmVisible.value = true;
    }

    async function handleDelete() {
      confirmVisible.value = false;
      try {
        await apiFetch('/api/cart/' + deleteItemId.value, { method: 'DELETE' });
        await refreshCart();
        Notification.show('已從購物車移除', 'success');
      } catch (e) {
        Notification.show('移除失敗', 'error');
      }
    }

    function goCheckout() {
      if (!Auth.isLoggedIn()) {
        window.location.href = '/login?redirect=/checkout';
        return;
      }
      window.location.href = '/checkout';
    }

    onMounted(function () {
      loadCart();
    });

    return {
      items, loading, total, confirmVisible,
      shippingFee, grandTotal, freeShippingThreshold,
      updateQuantity, confirmDelete, handleDelete, goCheckout
    };
  }
}).mount('#app');
