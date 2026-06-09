<template>
  <div class="questionnaire-settings">
    <div class="card mb-20">
      <div class="flex justify-between align-center">
        <div>
          <h2 class="settings-title">高级设置</h2>
          <p class="settings-desc">{{ questionnaire.title }}</p>
        </div>
        <div class="settings-actions">
          <el-button @click="handleBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <el-button type="primary" @click="handleSave" :loading="saving">
            <el-icon><Check /></el-icon>
            保存
          </el-button>
        </div>
      </div>
    </div>

    <div class="settings-content">
      <div class="left-menu card">
        <el-menu
          :default-active="activeTab"
          class="settings-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item index="basic">
            <el-icon><Setting /></el-icon>
            <span>基础设置</span>
          </el-menu-item>
          <el-menu-item index="access">
            <el-icon><Lock /></el-icon>
            <span>访问控制</span>
          </el-menu-item>
          <el-menu-item index="submit">
            <el-icon><CircleCheck /></el-icon>
            <span>提交限制</span>
          </el-menu-item>
          <el-menu-item index="logic">
            <el-icon><Guide /></el-icon>
            <span>逻辑设置</span>
          </el-menu-item>
        </el-menu>
      </div>

      <div class="right-content card">
        <el-form :model="settingsForm" :rules="rules" ref="settingsFormRef" label-width="120px" v-loading="loading">
          <div v-show="activeTab === 'basic'" class="tab-content">
            <h3 class="tab-title">基础设置</h3>
            <el-form-item label="定时发布" prop="publishTime">
              <el-date-picker
                v-model="settingsForm.publishTime"
                type="datetime"
                placeholder="选择发布时间"
                style="width: 300px"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
              <span class="form-tip">设置后问卷将在指定时间自动发布</span>
            </el-form-item>

            <el-form-item label="定时过期" prop="expireTime">
              <el-date-picker
                v-model="settingsForm.expireTime"
                type="datetime"
                placeholder="选择过期时间"
                style="width: 300px"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
              <span class="form-tip">设置后问卷将在指定时间自动过期</span>
            </el-form-item>

            <el-form-item label="问卷状态" prop="status">
              <el-switch
                v-model="settingsForm.status"
                active-text="启用"
                inactive-text="停用"
                :active-value="1"
                :inactive-value="0"
              />
              <span class="form-tip">停用后用户将无法访问和填写问卷</span>
            </el-form-item>
          </div>

          <div v-show="activeTab === 'access'" class="tab-content">
            <h3 class="tab-title">访问控制</h3>
            <el-form-item label="访问方式" prop="accessType">
              <el-radio-group v-model="settingsForm.accessType">
                <el-radio label="public">公开访问</el-radio>
                <el-radio label="password">密码访问</el-radio>
              </el-radio-group>
              <span class="form-tip">选择问卷的访问权限</span>
            </el-form-item>

            <el-form-item
              v-if="settingsForm.accessType === 'password'"
              label="访问密码"
              prop="password"
            >
              <el-input
                v-model="settingsForm.password"
                type="password"
                placeholder="请输入访问密码"
                style="width: 300px"
                show-password
              />
              <span class="form-tip">用户访问时需要输入此密码</span>
            </el-form-item>
          </div>

          <div v-show="activeTab === 'submit'" class="tab-content">
            <h3 class="tab-title">提交限制</h3>
            <el-form-item label="单人限填次数" prop="maxSubmissions">
              <el-input-number
                v-model="settingsForm.maxSubmissions"
                :min="0"
                :max="1000"
                style="width: 200px"
              />
              <span class="form-tip">0表示不限制，同一用户最多可填写的次数</span>
            </el-form-item>

            <el-form-item label="IP限制" prop="ipLimit">
              <el-switch
                v-model="settingsForm.ipLimit"
                active-text="启用"
                inactive-text="停用"
              />
              <span class="form-tip">启用后同一IP地址只能提交一次</span>
            </el-form-item>
          </div>

          <div v-show="activeTab === 'logic'" class="tab-content">
            <h3 class="tab-title">逻辑跳转总览</h3>
            <p class="logic-intro">逻辑跳转规则在问卷编辑页面中按题目配置。此处展示当前问卷已配置的所有跳转规则。</p>
            <div v-if="logicRules.length > 0" class="logic-rules">
              <div v-for="rule in logicRules" :key="rule.questionId" class="logic-rule-item">
                <div class="rule-source">
                  <el-tag type="primary" size="small">Q{{ rule.questionIndex + 1 }}</el-tag>
                  <span class="rule-title">{{ rule.questionTitle }}</span>
                </div>
                <div class="rule-conditions">
                  <div v-for="(cond, ci) in rule.conditions" :key="ci" class="rule-condition">
                    <span class="rule-arrow">→</span>
                    <span class="rule-text">选择了「{{ cond.value }}」</span>
                    <span class="rule-arrow">→</span>
                    <span class="rule-target">跳转到 Q{{ cond.targetIndex + 1 }}. {{ cond.targetTitle }}</span>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无逻辑跳转规则" :image-size="80">
              <el-button type="primary" @click="goToEdit">前往编辑页面配置</el-button>
            </el-empty>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Check,
  Setting,
  Lock,
  CircleCheck,
  Guide
} from '@element-plus/icons-vue'
import {
  getQuestionnaireDetail,
  getQuestionnaireSettings,
  updateQuestionnaireSettings
} from '@/api/questionnaire'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const settingsFormRef = ref(null)
const questionsList = ref([])

const questionnaire = reactive({
  id: '',
  title: ''
})

const logicRules = computed(() => {
  return questionsList.value
    .map((q, i) => {
      let jumpLogic = q.jump_logic
      if (!jumpLogic) return null
      if (typeof jumpLogic === 'string') {
        try { jumpLogic = JSON.parse(jumpLogic) } catch { return null }
      }
      if (!jumpLogic.conditions || jumpLogic.conditions.length === 0) return null
      return {
        questionId: q.id,
        questionIndex: i,
        questionTitle: q.title || '未命名题目',
        conditions: jumpLogic.conditions.map(c => {
          const targetIdx = questionsList.value.findIndex(tq => tq.id === c.target)
          return {
            value: c.value,
            target: c.target,
            targetIndex: targetIdx !== -1 ? targetIdx : questionsList.value.length,
            targetTitle: targetIdx !== -1 ? (questionsList.value[targetIdx].title || '未命名题目') : '问卷结束'
          }
        })
      }
    })
    .filter(Boolean)
})

const settingsForm = reactive({
  publishTime: '',
  expireTime: '',
  status: 1,
  accessType: 'public',
  password: '',
  maxSubmissions: 0,
  ipLimit: false
})

const rules = {
  password: [
    {
      required: true,
      message: '请输入访问密码',
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (settingsForm.accessType === 'password' && !value.trim()) {
          callback(new Error('请输入访问密码'))
        } else {
          callback()
        }
      }
    }
  ]
}

const handleMenuSelect = (index) => {
  activeTab.value = index
}

const fetchSettings = async () => {
  const id = route.params.id
  if (!id) return

  loading.value = true
  try {
    const [detailRes, settingsRes] = await Promise.all([
      getQuestionnaireDetail(id),
      getQuestionnaireSettings(id)
    ])

    if (detailRes.code === 200) {
      questionnaire.id = detailRes.data.questionnaire.id
      questionnaire.title = detailRes.data.questionnaire.title
      questionsList.value = detailRes.data.questions || []
    }

    if (settingsRes.code === 200) {
      const data = settingsRes.data || {}
      settingsForm.publishTime = data.publishTime || ''
      settingsForm.expireTime = data.expireTime || ''
      settingsForm.status = data.status !== undefined ? data.status : 1
      settingsForm.accessType = data.accessType || 'public'
      settingsForm.password = data.password || ''
      settingsForm.maxSubmissions = data.maxSubmissions !== undefined ? data.maxSubmissions : 0
      settingsForm.ipLimit = data.ipLimit || false
    }
  } catch (error) {
    console.error('Fetch settings error:', error)
    ElMessage.error('获取设置失败')
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  try {
    await settingsFormRef.value.validate()
  } catch (error) {
    return
  }

  if (settingsForm.publishTime && settingsForm.expireTime) {
    if (new Date(settingsForm.publishTime) >= new Date(settingsForm.expireTime)) {
      ElMessage.warning('发布时间必须早于过期时间')
      return
    }
  }

  saving.value = true
  try {
    const res = await updateQuestionnaireSettings(questionnaire.id, {
      publishTime: settingsForm.publishTime,
      expireTime: settingsForm.expireTime,
      status: settingsForm.status,
      accessType: settingsForm.accessType,
      password: settingsForm.accessType === 'password' ? settingsForm.password : '',
      maxSubmissions: settingsForm.maxSubmissions,
      ipLimit: settingsForm.ipLimit
    })

    if (res.code === 200) {
      ElMessage.success('保存成功')
    }
  } catch (error) {
    console.error('Save settings error:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleBack = () => {
  router.push(`/questionnaire/edit/${questionnaire.id}`)
}

const goToEdit = () => {
  router.push(`/questionnaire/edit/${questionnaire.id}`)
}

onMounted(() => {
  fetchSettings()
})
</script>

<style lang="scss" scoped>
.questionnaire-settings {
  .settings-title {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #333;
  }

  .settings-desc {
    margin: 0;
    color: #666;
  }

  .settings-content {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }

  .left-menu {
    width: 220px;
    flex-shrink: 0;
    padding: 12px;
    position: sticky;
    top: 20px;

    .settings-menu {
      border-right: none;

      :deep(.el-menu-item) {
        height: 48px;
        line-height: 48px;
        margin-bottom: 4px;
        border-radius: 6px;

        &:hover {
          background-color: #ecf5ff;
        }

        &.is-active {
          background-color: #409eff;
          color: #fff;

          &:hover {
            background-color: #66b1ff;
          }
        }
      }
    }
  }

  .right-content {
    flex: 1;
    min-width: 0;

    .tab-content {
      .tab-title {
        margin: 0 0 24px 0;
        padding-bottom: 12px;
        font-size: 18px;
        color: #333;
        border-bottom: 1px solid #ebeef5;
      }

      :deep(.el-form-item) {
        margin-bottom: 28px;

        .el-form-item__label {
          font-weight: 500;
          color: #333;
        }
      }
    }

    .form-tip {
      margin-left: 12px;
      color: #909399;
      font-size: 12px;
    }

    .logic-intro {
      font-size: 14px;
      color: #909399;
      margin: 0 0 20px 0;
      line-height: 1.6;
    }

    .logic-rules {
      .logic-rule-item {
        background: #fdf6ec;
        border: 1px solid #faecd8;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;

        .rule-source {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;

          .rule-title {
            font-weight: 500;
            color: #333;
            font-size: 14px;
          }
        }

        .rule-conditions {
          padding-left: 20px;

          .rule-condition {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            padding: 8px 12px;
            background: #fff;
            border-radius: 6px;

            .rule-arrow {
              color: #e6a23c;
              font-weight: bold;
            }

            .rule-text {
              color: #666;
              font-size: 13px;
            }

            .rule-target {
              color: #409eff;
              font-size: 13px;
              font-weight: 500;
            }
          }
        }
      }
    }
  }
}
</style>
