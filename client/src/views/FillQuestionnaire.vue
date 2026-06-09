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
      <van-empty :description="errorMessage" />
      <van-button type="primary" block @click="fetchQuestionnaire" class="retry-btn">
        重新加载
      </van-button>
    </div>

    <div v-else-if="needPassword" class="password-container">
      <div class="password-content">
        <div class="password-icon">
          <van-icon name="lock" size="64" color="#1989fa" />
        </div>
        <h3 class="password-title">该问卷需要密码访问</h3>
        <p class="password-desc">请输入问卷密码以继续填写</p>
        <van-field
          v-model="password"
          type="password"
          placeholder="请输入访问密码"
          class="password-input"
          :border="false"
          :error-message="passwordError"
          @keyup.enter="verifyPassword"
        />
        <van-button
          type="primary"
          block
          :loading="verifying"
          :disabled="verifying || !password"
          @click="verifyPassword"
          class="verify-btn"
        >
          验证并进入
        </van-button>
      </div>
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
          v-show="!skippedQuestions.includes(question.id)"
          @jump="handleQuestionJump"
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
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { getPublicQuestionnaire, submitQuestionnaire, verifyQuestionnaireAccess } from '../api/questionnaire'
import FormItem from '../components/FormItem.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(false)
const errorMessage = ref('问卷不存在或已停用')
const needPassword = ref(false)
const password = ref('')
const verifying = ref(false)
const passwordError = ref('')
const submitting = ref(false)
const questionnaire = ref({})
const questions = ref([])
const answers = reactive({})
const errors = reactive({})
const skippedQuestions = ref([])
const respondentIdentity = ref(null)
const verifiedPassword = ref('')

const generateIdentity = () => {
  const ua = navigator.userAgent
  let hash = 0
  const str = ua
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

const verifyAccess = async () => {
  try {
    loading.value = true
    error.value = false
    needPassword.value = false
    passwordError.value = ''
    const id = route.params.id
    respondentIdentity.value = generateIdentity()
    
    const res = await verifyQuestionnaireAccess(id, {
      identity: respondentIdentity.value
    })
    
    if (res.code === 200) {
      if (res.data.needPassword) {
        needPassword.value = true
        loading.value = false
        return
      }
      
      await fetchQuestionnaire()
    }
  } catch (err) {
    error.value = true
    if (err.response?.status === 403) {
      errorMessage.value = err.response.data?.message || '您已达到填写次数上限'
    } else if (err.response?.status === 404) {
      errorMessage.value = '问卷不存在或已停用'
    } else {
      errorMessage.value = '访问验证失败，请重试'
    }
    loading.value = false
  }
}

const verifyPassword = async () => {
  if (!password.value.trim()) {
    passwordError.value = '请输入密码'
    return
  }
  
  verifying.value = true
  passwordError.value = ''
  
  try {
    const id = route.params.id
    const res = await verifyQuestionnaireAccess(id, {
      identity: respondentIdentity.value,
      password: password.value
    })
    
    if (res.code === 200) {
      if (res.data.needPassword) {
        passwordError.value = '密码错误，请重新输入'
      } else {
        verifiedPassword.value = password.value
        needPassword.value = false
        await fetchQuestionnaire()
      }
    }
  } catch (err) {
    if (err.response?.status === 401) {
      passwordError.value = '密码错误，请重新输入'
    } else {
      passwordError.value = '验证失败，请重试'
    }
  } finally {
    verifying.value = false
  }
}

const fetchQuestionnaire = async () => {
  try {
    loading.value = true
    error.value = false
    const id = route.params.id
    const params = {}
    if (verifiedPassword.value) {
      params.password = verifiedPassword.value
    }
    
    const res = await getPublicQuestionnaire(id, params)
    questionnaire.value = res.data.questionnaire
    questions.value = res.data.questions
    
    questions.value.forEach(q => {
      if (q.type === 'checkbox') {
        answers[q.id] = []
      } else if (q.type === 'rating') {
        answers[q.id] = null
      } else if (q.type === 'date' && q.dateType === 'daterange') {
        answers[q.id] = []
      } else {
        answers[q.id] = ''
      }
      
      if (q.jump_logic) {
        try {
          q.jump_logic = typeof q.jump_logic === 'string' 
            ? JSON.parse(q.jump_logic) 
            : q.jump_logic
        } catch (e) {
          q.jump_logic = null
        }
      }
    })
  } catch (err) {
    error.value = true
    if (err.response?.status === 403) {
      errorMessage.value = '该问卷需要密码访问'
      needPassword.value = true
    } else {
      errorMessage.value = '获取问卷失败，请重试'
    }
    console.error('获取问卷失败:', err)
  } finally {
    loading.value = false
  }
}

const handleQuestionJump = async (targetQuestionId) => {
  const currentQuestionIdx = questions.value.findIndex(q => q.jump_logic)
  const targetIndex = questions.value.findIndex(q => q.id === targetQuestionId)
  
  if (targetIndex === -1) return
  
  if (currentQuestionIdx !== -1 && targetIndex > currentQuestionIdx) {
    skippedQuestions.value = questions.value
      .slice(currentQuestionIdx + 1, targetIndex)
      .map(q => q.id)
  }
  
  await nextTick()
}

const validateForm = () => {
  let isValid = true
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })

  for (const q of questions.value) {
    if (skippedQuestions.value.includes(q.id)) {
      continue
    }
    
    if (q.required && q.type !== 'description') {
      const answer = answers[q.id]
      const isEmpty = answer === undefined || answer === null || answer === '' || 
          (Array.isArray(answer) && answer.length === 0)
      
      if (isEmpty) {
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
    
    const submitData = {
      answers: {},
      identity: respondentIdentity.value
    }
    
    if (verifiedPassword.value) {
      submitData.password = verifiedPassword.value
    }
    
    Object.keys(answers).forEach(key => {
      if (!skippedQuestions.value.includes(parseInt(key))) {
        submitData.answers[key] = answers[key]
      }
    })
    
    await submitQuestionnaire(id, submitData)
    showToast('提交成功')
    setTimeout(() => {
      router.replace('/success')
    }, 500)
  } catch (err) {
    console.error('提交失败:', err)
    if (err.response?.data?.message) {
      showDialog({
        title: '提示',
        message: err.response.data.message,
        confirmButtonText: '我知道了'
      })
    } else if (err.response?.status === 429) {
      showDialog({
        title: '提示',
        message: '您已经提交过此问卷，请勿重复提交',
        confirmButtonText: '我知道了'
      })
    } else {
      showToast('提交失败，请重试')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  verifyAccess()
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

.password-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);

  .password-content {
    padding: 40px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;

    .password-icon {
      margin-top: 60px;
      margin-bottom: 32px;
      width: 120px;
      height: 120px;
      background: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(25, 137, 250, 0.15);
    }

    .password-title {
      font-size: 22px;
      font-weight: 600;
      color: #323233;
      margin: 0 0 8px 0;
    }

    .password-desc {
      font-size: 14px;
      color: #969799;
      margin: 0 0 40px 0;
    }

    .password-input {
      width: 100%;
      margin-bottom: 32px;

      :deep(.van-field__control) {
        background: #fff;
        border-radius: 24px;
        padding: 16px 24px;
        text-align: center;
        font-size: 18px;
        letter-spacing: 8px;
      }
    }

    .verify-btn {
      width: 100%;
      border-radius: 24px;
      height: 48px;
      font-size: 16px;
      font-weight: 500;
    }
  }
}
</style>
