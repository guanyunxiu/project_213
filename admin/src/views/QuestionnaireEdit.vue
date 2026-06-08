<template>
  <div class="questionnaire-edit">
    <div class="edit-header card mb-20">
      <div class="flex justify-between align-center">
        <div class="header-info">
          <el-input
            v-model="questionnaire.title"
            placeholder="请输入问卷标题"
            size="large"
            class="title-input"
          />
          <el-input
            v-model="questionnaire.description"
            placeholder="请输入问卷描述（选填）"
            size="small"
            class="desc-input"
            type="textarea"
            :rows="2"
          />
        </div>
        <div class="header-actions">
          <el-button @click="handleBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <el-button type="primary" @click="handlePreview">
            <el-icon><View /></el-icon>
            预览
          </el-button>
          <el-button type="success" @click="handleSave" :loading="saving">
            <el-icon><Check /></el-icon>
            保存
          </el-button>
        </div>
      </div>
    </div>

    <div class="edit-content">
      <div class="left-panel">
        <QuestionTypePanel />
      </div>

      <div class="main-panel">
        <div
          class="questions-container"
          @dragover.prevent="handleDragOver"
          @drop="handleDrop"
        >
          <draggable
            v-model="questionnaire.questions"
            item-key="id"
            handle=".question-item"
            animation="300"
            ghost-class="ghost"
            @end="handleDragEnd"
          >
            <template #item="{ element, index }">
              <QuestionItem
                :question="element"
                :index="index"
                :total="questionnaire.questions.length"
                :is-edit="true"
                @update="(data) => handleQuestionUpdate(index, data)"
                @delete="() => handleQuestionDelete(index)"
                @move-up="() => handleMoveUp(index)"
                @move-down="() => handleMoveDown(index)"
              />
            </template>
          </draggable>

          <div v-if="questionnaire.questions.length === 0" class="empty-tip">
            <el-empty description="从左侧拖拽题型到这里，或点击添加题目">
              <el-button type="primary" @click="addQuestion('radio')">
                <el-icon><Plus /></el-icon>
                添加题目
              </el-button>
            </el-empty>
          </div>
        </div>

        <div v-if="questionnaire.questions.length > 0" class="add-question-bar">
          <div class="add-buttons">
            <el-button size="small" @click="addQuestion('radio')">
              <el-icon><CreditCard /></el-icon>
              单选题
            </el-button>
            <el-button size="small" @click="addQuestion('checkbox')">
              <el-icon><Select /></el-icon>
              多选题
            </el-button>
            <el-button size="small" @click="addQuestion('text')">
              <el-icon><Edit /></el-icon>
              文本题
            </el-button>
            <el-button size="small" @click="addQuestion('textarea')">
              <el-icon><ChatLineSquare /></el-icon>
              多行文本
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  View,
  Check,
  Plus,
  CreditCard,
  Select,
  Edit,
  ChatLineSquare
} from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import QuestionTypePanel from '@/components/QuestionTypePanel.vue'
import QuestionItem from '@/components/QuestionItem.vue'
import { getQuestionnaireDetail, updateQuestionnaire } from '@/api/questionnaire'

const route = useRoute()
const router = useRouter()

const saving = ref(false)
const questionnaire = reactive({
  id: '',
  title: '',
  description: '',
  questions: []
})

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const createQuestion = (type) => {
  const baseQuestion = {
    id: generateId(),
    type,
    title: '',
    required: true,
    placeholder: ''
  }

  if (type === 'radio' || type === 'checkbox') {
    baseQuestion.options = ['选项1', '选项2']
  }

  return baseQuestion
}

const addQuestion = (type) => {
  const question = createQuestion(type)
  questionnaire.questions.push(question)
}

const handleQuestionUpdate = (index, data) => {
  questionnaire.questions[index] = data
}

const handleQuestionDelete = (index) => {
  questionnaire.questions.splice(index, 1)
}

const handleMoveUp = (index) => {
  if (index > 0) {
    const temp = questionnaire.questions[index]
    questionnaire.questions[index] = questionnaire.questions[index - 1]
    questionnaire.questions[index - 1] = temp
  }
}

const handleMoveDown = (index) => {
  if (index < questionnaire.questions.length - 1) {
    const temp = questionnaire.questions[index]
    questionnaire.questions[index] = questionnaire.questions[index + 1]
    questionnaire.questions[index + 1] = temp
  }
}

const handleDragOver = (e) => {
  e.dataTransfer.dropEffect = 'copy'
}

const handleDrop = (e) => {
  const type = e.dataTransfer.getData('questionType')
  if (type) {
    addQuestion(type)
  }
}

const handleDragEnd = () => {
}

const fetchDetail = async () => {
  const id = route.params.id
  if (!id || id === 'new') return

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
  }
}

const handleSave = async () => {
  if (!questionnaire.title.trim()) {
    ElMessage.warning('请输入问卷标题')
    return
  }

  for (let i = 0; i < questionnaire.questions.length; i++) {
    const q = questionnaire.questions[i]
    if (!q.title.trim()) {
      ElMessage.warning(`第${i + 1}题请输入题目标题`)
      return
    }
  }

  saving.value = true
  try {
    const res = await updateQuestionnaire(questionnaire.id, {
      title: questionnaire.title,
      description: questionnaire.description,
      questions: questionnaire.questions
    })
    if (res.code === 200) {
      ElMessage.success('保存成功')
    }
  } catch (error) {
    console.error('Save error:', error)
  } finally {
    saving.value = false
  }
}

const handlePreview = () => {
  router.push(`/questionnaire/preview/${questionnaire.id}`)
}

const handleBack = () => {
  router.push('/questionnaire')
}

onMounted(() => {
  fetchDetail()
})
</script>

<style lang="scss" scoped>
.questionnaire-edit {
  .edit-header {
    .title-input {
      width: 500px;
      margin-bottom: 12px;

      :deep(.el-input__inner) {
        font-size: 20px;
        font-weight: 600;
      }
    }

    .desc-input {
      width: 500px;
    }
  }

  .edit-content {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }

  .left-panel {
    width: 220px;
    flex-shrink: 0;
    position: sticky;
    top: 20px;
  }

  .main-panel {
    flex: 1;
    min-width: 0;
  }

  .questions-container {
    min-height: 400px;
    padding: 20px;
    background: #f5f7fa;
    border-radius: 8px;
    border: 2px dashed #dcdfe6;
    transition: all 0.2s;

    &:hover {
      border-color: #409EFF;
    }
  }

  .empty-tip {
    padding: 60px 0;
  }

  .add-question-bar {
    margin-top: 20px;
    padding: 16px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

    .add-buttons {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
  }

  :deep(.ghost) {
    opacity: 0.5;
    background: #c8ebfb;
  }
}
</style>
