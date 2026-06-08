<template>
  <div class="success-page">
    <div class="success-content">
      <div class="success-icon">
        <van-icon name="checked" size="64px" color="#07c160" />
      </div>
      <h1 class="success-title">提交成功</h1>
      <p class="success-desc">感谢您的参与，您的回答已成功提交！</p>
      
      <div class="action-buttons">
        <van-button
          type="primary"
          size="large"
          block
          @click="handleBack"
          class="back-btn"
        >
          返回首页
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const handleBack = () => {
  router.replace('/')
}
</script>

<style lang="scss" scoped>
.success-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f7f8fa 0%, #e8f4ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.success-content {
  width: 100%;
  max-width: 320px;
  text-align: center;
}

.success-icon {
  width: 100px;
  height: 100px;
  margin: 0 auto 24px;
  background-color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(7, 193, 96, 0.2);
  animation: scaleIn 0.5s ease-out;
}

@keyframes scaleIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.success-title {
  font-size: 24px;
  font-weight: 600;
  color: #323233;
  margin: 0 0 12px 0;
}

.success-desc {
  font-size: 14px;
  color: #646566;
  line-height: 1.6;
  margin: 0 0 40px 0;
}

.action-buttons {
  width: 100%;
}

.back-btn {
  border-radius: 24px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #1989fa 0%, #58a0ff 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.3);
}
</style>
