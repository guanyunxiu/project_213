<template>
  <div class="questionnaire-preview">
    <div class="card mb-20">
      <div class="flex justify-between align-center">
        <h2 class="preview-title">问卷预览</h2>
        <div class="preview-actions">
          <el-button @click="handleBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <el-button type="primary" @click="handleEdit">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
        </div>
      </div>
    </div>

    <div class="preview-container card" v-loading="loading">
      <div class="questionnaire-header">
        <h1 class="questionnaire-title">{{ questionnaire.title }}</h1>
        <p v-if="questionnaire.description" class="questionnaire-desc">{{ questionnaire.description }}</p>
        <el-divider />
      </div>

      <div v-if="questionnaire.questions && questionnaire.questions.length > 0">
        <QuestionItem
          v-for="(question, index) in questionnaire.questions"
          :key="question.id"
          :question="question"
          :index="index"
          :total="questionnaire.questions.length"
          :is-edit="false"
        />
      </div>

      <el-empty v-else description="该问卷暂无题目" />

      <div v-if="questionnaire.questions && questionnaire.questions.length > 0" class="submit-bar">
        <el-button type="primary" size="large" disabled>
          提交问卷
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Edit } from '@element-plus/icons-vue'
import QuestionItem from '@/components/QuestionItem.vue'
import { getQuestionnaireDetail } from '@/api/questionnaire'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const questionnaire = reactive({
  id: '',
  title: '',
  description: '',
  questions: []
})

const fetchDetail = async () => {
  const id = route.params.id
  if (!id) return

  loading.value = true
  try {
    const res = await getQuestionnaireDetail(id)
    if (res.code === 200) {
      questionnaire.id = res.data.questionnaire.id
      questionnaire.title = res.data.questionnaire.title
      questionnaire.description = res.data.questionnaire.description || ''
      questionnaire.questions = res.data.questions || []
    }
  } catch (error) {
    console.error('Fetch detail error:', error)
  } finally {
    loading.value = false
  }
}

const handleBack = () => {
  router.push('/questionnaire')
}

const handleEdit = () => {
  router.push(`/questionnaire/edit/${questionnaire.id}`)
}

onMounted(() => {
  fetchDetail()
})
</script>

<style lang="scss" scoped>
.questionnaire-preview {
  max-width: 800px;
  margin: 0 auto;

  .preview-title {
    margin: 0;
    font-size: 20px;
    color: #333;
  }

  .preview-container {
    padding: 40px;
  }

  .questionnaire-header {
    text-align: center;
    margin-bottom: 30px;

    .questionnaire-title {
      margin: 0 0 16px 0;
      font-size: 28px;
      color: #333;
      font-weight: 600;
    }

    .questionnaire-desc {
      margin: 0;
      color: #666;
      font-size: 15px;
      line-height: 1.6;
    }
  }

  .submit-bar {
    margin-top: 40px;
    text-align: center;
  }
}
</style>
