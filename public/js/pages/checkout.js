const { createApp, ref, computed, watch, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const loading = ref(true);
    const submitting = ref(false);
    const cartItems = ref([]);
    const form = ref({
      recipientName: '',
      recipientEmail: '',
      recipientAddress: '',
      shippingMethod: 'home',
      isExpress: false
    });
    const errors = ref({});
    const shippingFee = ref(0);
    const isRemoteArea = ref(false);

    const cartTotal = computed(function () {
      return cartItems.value.reduce(function (sum, item) {
        return sum + item.product.price * item.quantity;
      }, 0);
    });

    const grandTotal = computed(function () {
      return cartTotal.value + shippingFee.value;
    });

    let quoteTimer = null;
    async function fetchShippingQuote() {
      try {
        const params = new URLSearchParams({
          method: form.value.shippingMethod,
          isExpress: form.value.isExpress ? 'true' : 'false',
          address: form.value.recipientAddress || ''
        });
        const res = await apiFetch('/api/cart?' + params.toString());
        shippingFee.value = res.data.shipping_fee;
        isRemoteArea.value = res.data.is_remote_area;
      } catch (e) {
        // 試算失敗時保留前一次的運費估算，不打斷結帳流程
      }
    }

    function scheduleShippingQuote(immediate) {
      clearTimeout(quoteTimer);
      if (immediate) {
        fetchShippingQuote();
        return;
      }
      quoteTimer = setTimeout(fetchShippingQuote, 400);
    }

    watch(function () { return form.value.shippingMethod; }, function () { scheduleShippingQuote(true); });
    watch(function () { return form.value.isExpress; }, function () { scheduleShippingQuote(true); });
    watch(function () { return form.value.recipientAddress; }, function () { scheduleShippingQuote(false); });

    function validate() {
      errors.value = {};
      if (!form.value.recipientName.trim()) errors.value.recipientName = '請輸入收件人姓名';
      if (!form.value.recipientEmail.trim()) {
        errors.value.recipientEmail = '請輸入 Email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.recipientEmail)) {
        errors.value.recipientEmail = 'Email 格式不正確';
      }
      if (!form.value.recipientAddress.trim()) errors.value.recipientAddress = '請輸入收件地址';
      return Object.keys(errors.value).length === 0;
    }

    async function submitOrder() {
      if (!validate() || submitting.value) return;
      submitting.value = true;
      try {
        const res = await apiFetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify(form.value)
        });
        Notification.show('訂單已建立，即將前往付款', 'success');
        window.location.href = '/payment/ecpay/start/' + res.data.id;
      } catch (err) {
        Notification.show(err?.data?.message || '訂單建立失敗', 'error');
      } finally {
        submitting.value = false;
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/cart');
        cartItems.value = res.data.items;
        if (cartItems.value.length === 0) {
          window.location.href = '/cart';
          return;
        }
        shippingFee.value = res.data.shipping_fee;
        isRemoteArea.value = res.data.is_remote_area;
      } catch (e) {
        window.location.href = '/cart';
        return;
      }
      loading.value = false;
    });

    return {
      loading, submitting, cartItems, form, errors,
      cartTotal, shippingFee, grandTotal, isRemoteArea,
      submitOrder
    };
  }
}).mount('#app');
