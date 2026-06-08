<template>
  <div class="fill-page">
    <van-nav-bar
      title="问卷填写"
      :fixed="true"
      :placeholder="true"
      :border="false"
      class="navbar"
    />

    <div v-if="loading" class="loading-container">
      <van-loading type="spinner" size="32px" color="#1989fa" />
      <p class="loading-text">加载中...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <van-empty description="问卷不存在或已停用" />
      <van-button type="primary" block @click="fetchQuestionnaire" class="retry-btn">
        重新加载
      </van-button>
    </div>

    <div v-else class="content">
      <div class="questionnaire-header">
        <h1 class="title">{{ questionnaire.title }}</h1>
        <p v-if="questionnaire.description" class="description">{{ questionnaire.description }}</p>
      </div>

      <div class="form-list">
        <FormItem
          v-for="(question, index) in questions"
          :key="question.id"
          :question="question"
          v-model="answers[question.id]"
          :error="errors[question.id]"
        />
      </div>

      <div class="submit-area">
        <van-button
          type="primary"
          size="large"
          block
          :loading="submitting"
          :disabled="submitting"
          loading-text="提交中..."
          @click="handleSubmit"
          class="submit-btn"
        >
          提交问卷
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { getPublicQuestionnaire, submitQuestionnaire } from '../api/questionnaire'
import FormItem from '../components/FormItem.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(false)
const submitting = ref(false)
const questionnaire = ref({})
const questions = ref([])
const answers = reactive({})
const errors = reactive({})

const fetchQuestionnaire = async () => {
  try {
    loading.value = true
    error.value = false
    const id = route.params.id
    const res = await getPublicQuestionnaire(id)
    questionnaire.value = res.data.questionnaire
    questions.value = res.data.questions
    
    questions.value.forEach(q => {
      if (q.type === 'checkbox') {
        answers[q.id] = []
      } else {
        answers[q.id] = ''
      }
    })
  } catch (err) {
    error.value = true
    console.error('获取问卷失败:', err)
  } finally {
    loading.value = false
  }
}

const validateForm = () => {
  let isValid = true
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })

  for (const q of questions.value) {
    if (q.required) {
      const answer = answers[q.id]
      if (answer === undefined || answer === null || answer === '' || 
          (Array.isArray(answer) && answer.length === 0)) {
        errors[q.id] = '此项为必填项'
        isValid = false
      }
    }
  }

  if (!isValid) {
    showToast('请完成所有必填项')
  }

  return isValid
}

const handleSubmit = async () => {
  if (submitting.value) {
    showToast('请勿重复提交')
    return
  }

  if (!validateForm()) {
    return
  }

  try {
    submitting.value = true
    const id = route.params.id
    await submitQuestionnaire(id, { answers })
    showToast('提交成功')
    setTimeout(() => {
      router.replace('/success')
    }, 500)
  } catch (err) {
    console.error('提交失败:', err)
    if (err.response && err.response.status === 429) {
      showDialog({
        title: '提示',
        message: '您已经提交过此问卷，请勿重复提交',
        confirmButtonText: '我知道了'
      })
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchQuestionnaire()
})
</script>

<style lang="scss" scoped>
.fill-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 40px;
}

.navbar {
  background: linear-gradient(135deg, #1989fa 0%, #58a0ff 100%);
  
  :deep(.van-nav-bar__title) {
    color: #fff;
    font-weight: 500;
  }

  :deep(.van-nav-bar__content) {
    height: 46px;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120px;
}

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: #969799;
}

.error-container {
  padding-top: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.retry-btn {
  margin-top: 24px;
  width: 200px;
}

.content {
  padding: 16px;
}

.questionnaire-header {
  background: linear-gradient(135deg, #1989fa 0%, #58a0ff 100%);
  border-radius: 16px;
  padding: 24px 20px;
  margin-bottom: 24px;
  color: #fff;
}

.title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  margin: 0 0 12px 0;
  word-break: break-all;
}

.description {
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  opacity: 0.9;
  word-break: break-all;
}

.form-list {
  margin-bottom: 24px;
}

.submit-area {
  position: sticky;
  bottom: 0;
  padding: 16px;
  background-color: #f7f8fa;
  margin: 0 -16px -40px;
}

.submit-btn {
  border-radius: 24px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.3);
}
</style>
