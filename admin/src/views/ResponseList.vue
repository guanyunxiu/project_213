<template>
  <div class="response-list">
    <div class="card mb-20">
      <div class="flex justify-between align-center">
        <div>
          <h2 class="list-title">填写记录</h2>
          <p class="list-desc">问卷：{{ questionnaire.title }} · 共 <el-tag type="primary">{{ pagination.total }}</el-tag> 条记录</p>
        </div>
        <div class="list-actions">
          <el-button @click="handleBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <el-dropdown @command="handleExport" trigger="click">
            <el-button type="success" :loading="exporting">
              <el-icon><Download /></el-icon>
              导出数据
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="xlsx">
                  <el-icon><Document /></el-icon>
                  导出 Excel
                </el-dropdown-item>
                <el-dropdown-item command="csv">
                  <el-icon><Tickets /></el-icon>
                  导出 CSV
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <div class="card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column v-for="question in questionnaire.questions" :key="question.id" :label="question.title" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.answers">
              {{ formatAnswer(row.answers[question.id], question.type) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="填写时间" width="180" fixed="right" />
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </div>

    <el-dialog v-model="detailDialogVisible" title="查看详情" width="600px">
      <div v-if="currentResponse" class="response-detail">
        <div class="detail-item">
          <span class="label">填写时间：</span>
          <span class="value">{{ currentResponse.createdAt }}</span>
        </div>
        <el-divider />
        <div v-for="question in questionnaire.questions" :key="question.id" class="answer-item">
          <h4 class="question-title">{{ question.title }}</h4>
          <p class="answer-content">
            {{ formatAnswer(currentResponse.answers?.[question.id], question.type) }}
          </p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Download, ArrowDown, Document, Tickets } from '@element-plus/icons-vue'
import { getResponseList, exportResponses } from '@/api/response'
import { getQuestionnaireDetail } from '@/api/questionnaire'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const exporting = ref(false)
const list = ref([])
const detailDialogVisible = ref(false)
const currentResponse = ref(null)

const questionnaire = reactive({
  id: '',
  title: '',
  questions: []
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const formatAnswer = (answer, type) => {
  if (!answer) return '-'
  if (type === 'checkbox') {
    if (Array.isArray(answer)) {
      return answer.join('、')
    } else if (typeof answer === 'string') {
      return answer.split(',').filter(Boolean).join('、')
    }
  }
  return answer
}

const fetchQuestionnaire = async () => {
  const id = route.params.id
  if (!id) return

  try {
    const res = await getQuestionnaireDetail(id)
    if (res.code === 200) {
      questionnaire.id = res.data.questionnaire.id
      questionnaire.title = res.data.questionnaire.title
      questionnaire.questions = res.data.questions || []
    }
  } catch (error) {
    console.error('Fetch questionnaire error:', error)
  }
}

const fetchList = async () => {
  const id = route.params.id
  if (!id) return

  loading.value = true
  try {
    const res = await getResponseList(id, {
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (res.code === 200) {
      list.value = res.data.list
      pagination.total = res.data.total
    }
  } catch (error) {
    console.error('Fetch list error:', error)
  } finally {
    loading.value = false
  }
}

const handleExport = async (format = 'xlsx') => {
  const id = route.params.id
  if (!id) return

  exporting.value = true
  try {
    const blob = await exportResponses(id, format)
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    const ext = format === 'csv' ? 'csv' : 'xlsx'
    link.setAttribute('download', `${questionnaire.title}_填写记录_${Date.now()}.${ext}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success(`导出${format === 'csv' ? 'CSV' : 'Excel'}成功`)
  } catch (error) {
    console.error('Export error:', error)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

const handleBack = () => {
  router.push('/questionnaire')
}

const viewDetail = (row) => {
  currentResponse.value = row
  detailDialogVisible.value = true
}

onMounted(async () => {
  await fetchQuestionnaire()
  fetchList()
})
</script>

<style lang="scss" scoped>
.response-list {
  .list-title {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #333;
  }

  .list-desc {
    margin: 0;
    color: #666;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  .response-detail {
    .detail-item {
      margin-bottom: 12px;

      .label {
        color: #666;
      }

      .value {
        color: #333;
      }
    }

    .answer-item {
      margin-bottom: 20px;

      .question-title {
        margin: 0 0 8px 0;
        font-size: 15px;
        color: #333;
        font-weight: 500;
      }

      .answer-content {
        margin: 0;
        padding: 12px;
        background: #f5f7fa;
        border-radius: 4px;
        color: #666;
        line-height: 1.6;
      }
    }
  }
}
</style>
