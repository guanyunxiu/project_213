<template>
  <div class="template-list">
    <div class="card mb-20">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="公共模板库" name="public" />
        <el-tab-pane label="我的模板" name="my" />
      </el-tabs>
    </div>

    <div class="card mb-20">
      <div class="flex justify-between align-center flex-wrap gap-10">
        <div class="flex gap-10 flex-wrap">
          <el-tag
            v-for="category in categories"
            :key="category.value"
            :type="selectedCategory === category.value ? 'primary' : 'info'"
            class="cursor-pointer"
            @click="handleCategoryChange(category.value)"
          >
            {{ category.label }}
          </el-tag>
        </div>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索模板名称"
          style="width: 300px"
          clearable
          @keyup.enter="fetchList"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <div class="template-grid" v-loading="loading">
      <div
        v-for="template in filteredTemplates"
        :key="template.id"
        class="template-card"
      >
        <div class="template-card-header">
          <div class="template-title">{{ template.title }}</div>
          <el-tag :type="getCategoryType(template.category)" size="small">
            {{ getCategoryLabel(template.category) }}
          </el-tag>
        </div>
        <div class="template-card-body">
          <p class="template-description">{{ template.description }}</p>
          <div class="template-meta">
            <span class="meta-item">
              <el-icon><Document /></el-icon>
              {{ template.questionCount || 0 }} 题
            </span>
            <span class="meta-item">
              <el-icon><View /></el-icon>
              {{ template.useCount || 0 }} 次使用
            </span>
            <span class="meta-item">
              <el-icon><Clock /></el-icon>
              {{ formatDate(template.createdAt) }}
            </span>
          </div>
        </div>
        <div class="template-card-footer">
          <el-button type="primary" size="small" @click="handleApply(template)">
            <el-icon><DocumentCopy /></el-icon>
            套用模板
          </el-button>
          <template v-if="activeTab === 'my'">
            <el-button type="success" size="small" @click="handleEdit(template)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(template)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </div>
      </div>
      <el-empty v-if="!loading && filteredTemplates.length === 0" description="暂无模板数据" />
    </div>

    <el-dialog
      v-model="applyDialogVisible"
      title="套用模板"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="applyForm" :rules="applyRules" ref="applyFormRef" label-width="80px">
        <el-form-item label="问卷标题" prop="title">
          <el-input v-model="applyForm.title" placeholder="请输入问卷标题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="问卷描述" prop="description">
          <el-input
            v-model="applyForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入问卷描述"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmApply" :loading="applying">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑模板"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="80px">
        <el-form-item label="模板名称" prop="title">
          <el-input v-model="editForm.title" placeholder="请输入模板名称" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="模板描述" prop="description">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入模板描述"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="模板分类" prop="category">
          <el-select v-model="editForm.category" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="category in categories"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEdit" :loading="editing">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Document, View, Clock, DocumentCopy, Edit, Delete } from '@element-plus/icons-vue'
import {
  getPublicTemplates,
  getMyTemplates,
  applyTemplate,
  deleteTemplate,
  updateTemplate
} from '@/api/questionnaire'

const router = useRouter()

const activeTab = ref('public')
const loading = ref(false)
const searchKeyword = ref('')
const selectedCategory = ref('all')
const templates = ref([])

const applyDialogVisible = ref(false)
const applying = ref(false)
const currentTemplate = ref(null)
const applyFormRef = ref(null)
const applyForm = reactive({
  title: '',
  description: ''
})
const applyRules = {
  title: [{ required: true, message: '请输入问卷标题', trigger: 'blur' }]
}

const editDialogVisible = ref(false)
const editing = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  id: '',
  title: '',
  description: '',
  category: 'custom'
})
const editRules = {
  title: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

const categories = [
  { value: 'all', label: '全部' },
  { value: 'survey', label: '调研' },
  { value: 'sign', label: '报名' },
  { value: 'feedback', label: '反馈' },
  { value: 'evaluation', label: '测评' },
  { value: 'custom', label: '自定义' }
]

const categoryMap = {
  survey: { label: '调研', type: 'primary' },
  sign: { label: '报名', type: 'success' },
  feedback: { label: '反馈', type: 'warning' },
  evaluation: { label: '测评', type: 'danger' },
  custom: { label: '自定义', type: 'info' }
}

const filteredTemplates = computed(() => {
  let result = templates.value
  if (selectedCategory.value !== 'all') {
    result = result.filter(item => item.category === selectedCategory.value)
  }
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(item =>
      item.title.toLowerCase().includes(keyword) ||
      (item.description && item.description.toLowerCase().includes(keyword))
    )
  }
  return result
})

const getCategoryLabel = (category) => {
  return categoryMap[category]?.label || '未知'
}

const getCategoryType = (category) => {
  return categoryMap[category]?.type || 'info'
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fetchList = async () => {
  loading.value = true
  try {
    const api = activeTab.value === 'public' ? getPublicTemplates : getMyTemplates
    const res = await api()
    if (res.code === 200) {
      templates.value = res.data.list || res.data || []
    }
  } catch (error) {
    console.error('Fetch templates error:', error)
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  selectedCategory.value = 'all'
  searchKeyword.value = ''
  fetchList()
}

const handleCategoryChange = (category) => {
  selectedCategory.value = category
}

const handleApply = (template) => {
  currentTemplate.value = template
  applyForm.title = template.title
  applyForm.description = template.description || ''
  applyDialogVisible.value = true
}

const confirmApply = async () => {
  if (!applyFormRef.value || !currentTemplate.value) return
  try {
    await applyFormRef.value.validate()
    applying.value = true
    const res = await applyTemplate(currentTemplate.value.id, {
      title: applyForm.title,
      description: applyForm.description
    })
    if (res.code === 200) {
      ElMessage.success('套用成功')
      applyDialogVisible.value = false
      router.push(`/questionnaire/edit/${res.data.id}`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Apply template error:', error)
    }
  } finally {
    applying.value = false
  }
}

const handleEdit = (template) => {
  editForm.id = template.id
  editForm.title = template.title
  editForm.description = template.description || ''
  editForm.category = template.category || 'custom'
  editDialogVisible.value = true
}

const confirmEdit = async () => {
  if (!editFormRef.value) return
  try {
    await editFormRef.value.validate()
    editing.value = true
    const res = await updateTemplate(editForm.id, {
      title: editForm.title,
      description: editForm.description,
      category: editForm.category
    })
    if (res.code === 200) {
      ElMessage.success('保存成功')
      editDialogVisible.value = false
      fetchList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Edit template error:', error)
    }
  } finally {
    editing.value = false
  }
}

const handleDelete = async (template) => {
  try {
    await ElMessageBox.confirm('确定要删除该模板吗？删除后无法恢复！', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await deleteTemplate(template.id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete template error:', error)
    }
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.template-list {
  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .template-card {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #e4e7ed;
    overflow: hidden;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }
  }

  .template-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px 16px 8px;
    gap: 10px;

    .template-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      line-height: 1.4;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }

  .template-card-body {
    padding: 0 16px 12px;

    .template-description {
      font-size: 13px;
      color: #606266;
      line-height: 1.5;
      margin-bottom: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      min-height: 39px;
    }

    .template-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 12px;
      color: #909399;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }

  .template-card-footer {
    padding: 12px 16px;
    border-top: 1px solid #ebeef5;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    background: #fafafa;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .gap-10 {
    gap: 10px;
  }

  .flex-wrap {
    flex-wrap: wrap;
  }
}
</style>
