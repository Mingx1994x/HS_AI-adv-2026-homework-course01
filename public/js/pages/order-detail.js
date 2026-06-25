const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;
    const paymentResult = ref(el.dataset.paymentResult || null);

    const order = ref(null);
    const loading = ref(true);

    const statusMap = {
      pending: { label: '待付款', dot: 'bg-bh-yellow' },
      paid: { label: '已付款', dot: 'bg-bh-blue' },
      failed: { label: '付款失敗', dot: 'bg-bh-red' },
    };

    const paymentMessages = {
      success: { text: '付款成功！感謝您的購買。', bg: 'bg-bh-blue' },
      fail: { text: '付款失敗，請重試。', bg: 'bg-bh-red' },
    };

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders/' + orderId);
        order.value = res.data;
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
      } finally {
        loading.value = false;
      }
    });

    return { order, loading, paymentResult, statusMap, paymentMessages };
  }
}).mount('#app');
