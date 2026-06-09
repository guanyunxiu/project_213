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
          <el-button @click="handleSaveAsTemplate">
            <el-icon><Collection /></el-icon>
            保存为模板
          </el-button>
          <el-button @click="handleAdvancedSettings">
            <el-icon><Setting /></el-icon>
            高级设置
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
                :questions-list="questionnaire.questions"
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
            <el-button size="small" @click="addQuestion('select')">
              <el-icon><List /></el-icon>
              下拉题
            </el-button>
            <el-button size="small" @click="addQuestion('text')">
              <el-icon><Edit /></el-icon>
              文本题
            </el-button>
            <el-button size="small" @click="addQuestion('textarea')">
              <el-icon><ChatLineSquare /></el-icon>
              多行文本
            </el-button>
            <el-button size="small" @click="addQuestion('date')">
              <el-icon><Calendar /></el-icon>
              日期题
            </el-button>
            <el-button size="small" @click="addQuestion('rating')">
              <el-icon><Star /></el-icon>
              量表题
            </el-button>
            <el-button size="small" @click="addQuestion('description')">
              <el-icon><Document /></el-icon>
              说明文本
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="saveAsTemplateDialogVisible" title="保存为模板" width="500px">
      <el-form :model="templateForm" label-width="80px">
        <el-form-item label="模板名称">
          <el-input v-model="templateForm.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板描述">
          <el-input v-model="templateForm.description" type="textarea" :rows="2" placeholder="请输入模板描述（选填）" />
        </el-form-item>
        <el-form-item label="模板分类">
          <el-select v-model="templateForm.category" style="width: 100%">
            <el-option label="调研问卷" value="survey" />
            <el-option label="报名登记" value="sign" />
            <el-option label="反馈收集" value="feedback" />
            <el-option label="测评评估" value="evaluation" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="公开模板">
          <el-switch v-model="templateForm.is_public" active-text="是" inactive-text="否" />
          <span style="color: #909399; font-size: 12px; margin-left: 12px;">公开后其他用户可以看到和使用此模板</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveAsTemplateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSaveAsTemplate">确定</el-button>
      </template>
    </el-dialog>
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
  ChatLineSquare,
  List,
  Calendar,
  Star,
  Document,
  Collection,
  Setting
} from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import QuestionTypePanel from '@/components/QuestionTypePanel.vue'
import QuestionItem from '@/components/QuestionItem.vue'
import { getQuestionnaireDetail, updateQuestionnaire, saveQuestionnaireAsTemplate } from '@/api/questionnaire'

const route = useRoute()
const router = useRouter()

const saving = ref(false)
const saveAsTemplateDialogVisible = ref(false)
const templateForm = reactive({
  name: '',
  description: '',
  category: 'custom',
  is_public: false
})

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

  if (type === 'radio' || type === 'checkbox' || type === 'select') {
    baseQuestion.options = ['选项1', '选项2']
  } else if (type === 'rating') {
    baseQuestion.options = { max: 5, showScore: false }
    baseQuestion.title = '请为以下项目评分'
  } else if (type === 'date') {
    baseQuestion.dateType = 'date'
    baseQuestion.title = '请选择日期'
  } else if (type === 'description') {
    baseQuestion.title = '这里是说明文本内容'
    baseQuestion.required = false
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

const handleSaveAsTemplate = () => {
  templateForm.name = questionnaire.title + ' 模板'
  templateForm.description = questionnaire.description
  saveAsTemplateDialogVisible.value = true
}

const confirmSaveAsTemplate = async () => {
  if (!templateForm.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }

  try {
    const res = await saveQuestionnaireAsTemplate(questionnaire.id, {
      name: templateForm.name,
      description: templateForm.description,
      category: templateForm.category,
      is_public: templateForm.is_public
    })
    if (res.code === 200) {
      ElMessage.success('保存为模板成功')
      saveAsTemplateDialogVisible.value = false
    }
  } catch (error) {
    console.error('Save as template error:', error)
  }
}

const handleAdvancedSettings = () => {
  router.push(`/questionnaire/settings/${questionnaire.id}`)
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
