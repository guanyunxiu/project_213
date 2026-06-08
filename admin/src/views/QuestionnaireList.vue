<template>
  <div class="questionnaire-list">
    <div class="card mb-20">
      <div class="flex justify-between align-center">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索问卷名称"
          style="width: 300px"
          clearable
          @keyup.enter="fetchList"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新建问卷
        </el-button>
      </div>
    </div>

    <div class="card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="问卷名称" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="questionCount" label="题目数" width="100" />
        <el-table-column prop="responseCount" label="填写数" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="success" link @click="handlePreview(row)">预览</el-button>
            <el-button type="warning" link @click="handleStats(row)">统计</el-button>
            <el-button type="info" link @click="handleResponses(row)">记录</el-button>
            <el-button type="primary" link @click="handleQrcode(row)">二维码</el-button>
            <el-button :type="row.status === 1 ? 'info' : 'success'" link @click="handleToggleStatus(row)">
              {{ row.status === 1 ? '停用' : '启用' }}
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
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

    <el-dialog v-model="qrcodeDialogVisible" title="问卷二维码" width="400px">
      <div class="qrcode-container">
        <img :src="qrcodeUrl" alt="问卷二维码" />
        <p class="qrcode-tip">扫描二维码即可填写问卷</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import {
  getQuestionnaireList,
  deleteQuestionnaire,
  toggleQuestionnaireStatus,
  createQuestionnaire
} from '@/api/questionnaire'
import QRCode from 'qrcode'

const router = useRouter()

const loading = ref(false)
const searchKeyword = ref('')
const list = ref([])
const qrcodeDialogVisible = ref(false)
const qrcodeUrl = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getQuestionnaireList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value
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

const handleCreate = async () => {
  try {
    const res = await createQuestionnaire({
      title: '未命名问卷',
      description: '',
      questions: []
    })
    if (res.code === 200) {
      ElMessage.success('创建成功')
      router.push(`/questionnaire/edit/${res.data.id}`)
    }
  } catch (error) {
    console.error('Create error:', error)
  }
}

const handleEdit = (row) => {
  router.push(`/questionnaire/edit/${row.id}`)
}

const handlePreview = (row) => {
  router.push(`/questionnaire/preview/${row.id}`)
}

const handleStats = (row) => {
  router.push(`/questionnaire/stats/${row.id}`)
}

const handleResponses = (row) => {
  router.push(`/questionnaire/responses/${row.id}`)
}

const handleQrcode = async (row) => {
  const url = `${window.location.origin}/client/questionnaire/${row.id}`
  qrcodeUrl.value = await QRCode.toDataURL(url, { width: 256 })
  qrcodeDialogVisible.value = true
}

const handleToggleStatus = async (row) => {
  const newStatus = row.status === 1 ? 0 : 1
  const actionText = newStatus === 1 ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确定要${actionText}该问卷吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await toggleQuestionnaireStatus(row.id, newStatus)
    if (res.code === 200) {
      ElMessage.success(`${actionText}成功`)
      fetchList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Toggle status error:', error)
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该问卷吗？删除后无法恢复！', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await deleteQuestionnaire(row.id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
    }
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.questionnaire-list {
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  .qrcode-container {
    text-align: center;

    img {
      width: 256px;
      height: 256px;
      margin-bottom: 16px;
    }

    .qrcode-tip {
      color: #999;
      font-size: 14px;
    }
  }
}
</style>
