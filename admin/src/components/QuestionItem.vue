<template>
  <div class="question-item" :class="{ 'is-edit': isEdit }">
    <div class="question-header" v-if="isEdit">
      <span class="question-type-tag">{{ typeLabel }}</span>
      <div class="question-actions">
        <el-button type="primary" link size="small" @click="moveUp" :disabled="index === 0">
          <el-icon><Top /></el-icon>
        </el-button>
        <el-button type="primary" link size="small" @click="moveDown" :disabled="index === total - 1">
          <el-icon><Bottom /></el-icon>
        </el-button>
        <el-button type="danger" link size="small" @click="handleDelete">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="question-content">
      <div class="question-title-row">
        <span class="question-index">Q{{ index + 1 }}.</span>
        <el-input
          v-if="isEdit"
          v-model="localQuestion.title"
          placeholder="请输入题目标题"
          size="large"
          class="question-title-input"
          @blur="emitChange"
        />
        <span v-else class="question-title-text">
          {{ localQuestion.title }}
          <span v-if="localQuestion.required" class="required">*</span>
        </span>
      </div>

      <div class="question-options" v-if="localQuestion.type === 'radio' || localQuestion.type === 'checkbox' || localQuestion.type === 'select'">
        <div
          v-for="(option, optIndex) in localQuestion.options"
          :key="optIndex"
          class="option-item"
        >
          <template v-if="!isEdit">
            <el-radio v-if="localQuestion.type === 'radio'" :label="option" :model-value="null" disabled>
              {{ option }}
            </el-radio>
            <el-checkbox v-else-if="localQuestion.type === 'checkbox'" :label="option" :model-value="[]" disabled>
              {{ option }}
            </el-checkbox>
            <el-select v-else disabled style="width: 200px">
              <el-option :label="option" :value="option" />
            </el-select>
          </template>
          <template v-else>
            <el-radio v-if="localQuestion.type === 'radio'" disabled :label="option" />
            <el-checkbox v-else-if="localQuestion.type === 'checkbox'" disabled :label="option" />
            <el-select v-else disabled style="width: 80px">
              <el-option :label="option" :value="option" />
            </el-select>
            <el-input
              v-model="localQuestion.options[optIndex]"
              placeholder="选项内容"
              size="small"
              class="option-input"
              @blur="emitChange"
            />
            <el-button
              type="danger"
              link
              size="small"
              @click="removeOption(optIndex)"
              :disabled="localQuestion.options.length <= 2"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </template>
        </div>
        <el-button v-if="isEdit" type="primary" link size="small" @click="addOption">
          <el-icon><Plus /></el-icon>
          添加选项
        </el-button>
      </div>

      <div v-else-if="localQuestion.type === 'text'" class="question-input">
        <el-input v-if="!isEdit" placeholder="请输入答案" disabled />
        <el-input
          v-else
          v-model="localQuestion.placeholder"
          placeholder="请输入占位文字"
          size="small"
          @blur="emitChange"
        />
      </div>

      <div v-else-if="localQuestion.type === 'textarea'" class="question-textarea">
        <el-input v-if="!isEdit" type="textarea" :rows="3" placeholder="请输入答案" disabled />
        <el-input
          v-else
          v-model="localQuestion.placeholder"
          type="textarea"
          :rows="3"
          placeholder="请输入占位文字"
          @blur="emitChange"
        />
      </div>

      <div v-else-if="localQuestion.type === 'date'" class="question-input">
        <el-date-picker v-if="!isEdit" type="date" placeholder="请选择日期" disabled style="width: 100%" />
        <div v-else class="date-settings">
          <span class="setting-label">日期类型：</span>
          <el-select v-model="localQuestion.dateType" size="small" @change="emitChange">
            <el-option label="日期" value="date" />
            <el-option label="日期时间" value="datetime" />
            <el-option label="日期范围" value="daterange" />
          </el-select>
        </div>
      </div>

      <div v-else-if="localQuestion.type === 'rating'" class="question-rating">
        <div v-if="!isEdit" class="rating-preview">
          <el-rate disabled :max="localQuestion.options?.max || 5" />
        </div>
        <div v-else class="rating-settings">
          <span class="setting-label">最大分值：</span>
          <el-input-number 
            v-model="ratingMax" 
            :min="3" 
            :max="10" 
            size="small" 
            @change="handleRatingMaxChange"
          />
          <span class="setting-label ml-20">显示分值：</span>
          <el-switch v-model="showScore" @change="handleShowScoreChange" />
        </div>
      </div>

      <div v-else-if="localQuestion.type === 'description'" class="question-description">
        <div v-if="!isEdit" class="description-text">
          {{ localQuestion.title }}
        </div>
        <div v-else class="description-edit">
          <el-input
            v-model="localQuestion.title"
            type="textarea"
            :rows="3"
            placeholder="请输入说明文本内容"
            @blur="emitChange"
          />
          <div class="description-tip">说明文本不需要填写，仅用于展示信息</div>
        </div>
      </div>
    </div>

    <div class="question-footer" v-if="isEdit">
      <div class="footer-left">
        <el-switch
          v-model="localQuestion.required"
          active-text="必填"
          inactive-text="选填"
          @change="emitChange"
        />
        <el-button
          v-if="canHaveLogic"
          type="warning"
          link
          size="small"
          @click="showLogicPanel = !showLogicPanel"
        >
          <el-icon><Guide /></el-icon>
          {{ hasLogic ? '编辑跳转' : '逻辑跳转' }}
          <el-tag v-if="hasLogic" type="warning" size="small" class="logic-count">{{ jumpLogic.conditions.length }}条规则</el-tag>
        </el-button>
      </div>
    </div>

    <div v-if="isEdit && showLogicPanel && canHaveLogic" class="logic-panel">
      <div class="logic-panel-header">
        <span class="logic-title">
          <el-icon><Guide /></el-icon>
          逻辑跳转设置
        </span>
        <span class="logic-desc">设置当用户选择某选项时，自动跳转到指定题目</span>
      </div>

      <div class="logic-conditions">
        <div v-for="(condition, cIdx) in jumpLogic.conditions" :key="cIdx" class="logic-condition">
          <span class="logic-label">如果选择了</span>
          <el-select
            v-if="hasOptions"
            v-model="condition.value"
            placeholder="选择选项"
            size="small"
            style="width: 140px"
            @change="emitLogicChange"
          >
            <el-option
              v-for="opt in localQuestion.options"
              :key="opt"
              :label="opt"
              :value="opt"
            />
          </el-select>
          <el-input
            v-else
            v-model="condition.value"
            placeholder="输入值"
            size="small"
            style="width: 140px"
            @change="emitLogicChange"
          />
          <span class="logic-label">则跳转到</span>
          <el-select
            v-model="condition.target"
            placeholder="选择目标题目"
            size="small"
            style="width: 200px"
            @change="emitLogicChange"
          >
            <el-option
              v-for="q in targetQuestions"
              :key="q.id"
              :label="`Q${q._displayIndex + 1}. ${q.title || '未命名题目'}`"
              :value="q.id"
            />
          </el-select>
          <el-button type="danger" link size="small" @click="removeCondition(cIdx)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <div class="logic-actions">
        <el-button type="primary" link size="small" @click="addCondition">
          <el-icon><Plus /></el-icon>
          添加跳转规则
        </el-button>
        <el-button
          v-if="hasLogic"
          type="danger"
          link
          size="small"
          @click="clearLogic"
        >
          清除所有跳转规则
        </el-button>
      </div>

      <div class="logic-tip">
        <el-icon><InfoFilled /></el-icon>
        逻辑跳转规则按顺序匹配，匹配到第一条规则后停止。未匹配任何规则时，继续显示下一题。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Top, Bottom, Delete, Close, Plus, Guide, InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  isEdit: {
    type: Boolean,
    default: true
  },
  questionsList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update', 'delete', 'moveUp', 'moveDown'])

const localQuestion = ref({ ...props.question })
const showLogicPanel = ref(false)

const ratingMax = ref(localQuestion.value.options?.max || 5)
const showScore = ref(localQuestion.value.options?.showScore || false)

const jumpLogic = ref({
  conditions: []
})

let skipWatchJumpLogic = false

const initJumpLogic = () => {
  if (localQuestion.value.jump_logic) {
    try {
      const logic = typeof localQuestion.value.jump_logic === 'string'
        ? JSON.parse(localQuestion.value.jump_logic)
        : localQuestion.value.jump_logic
      if (logic.conditions && logic.conditions.length > 0) {
        jumpLogic.value = {
          conditions: logic.conditions.map(c => ({ ...c }))
        }
        return
      }
    } catch (e) { /* fallthrough */ }
  }
  jumpLogic.value = { conditions: [] }
}

initJumpLogic()

watch(() => props.question, (newVal, oldVal) => {
  localQuestion.value = { ...newVal }
  if (newVal.type === 'rating') {
    ratingMax.value = newVal.options?.max || 5
    showScore.value = newVal.options?.showScore || false
  }
  if (skipWatchJumpLogic) {
    skipWatchJumpLogic = false
    return
  }
  initJumpLogic()
}, { deep: true })

const canHaveLogic = computed(() => {
  return ['radio', 'checkbox', 'select'].includes(localQuestion.value.type)
})

const hasOptions = computed(() => {
  return ['radio', 'checkbox', 'select'].includes(localQuestion.value.type)
})

const hasLogic = computed(() => {
  return jumpLogic.value.conditions && jumpLogic.value.conditions.length > 0
})

const targetQuestions = computed(() => {
  return props.questionsList
    .map((q, i) => ({ ...q, _displayIndex: i }))
    .filter((q, i) => i > props.index)
})

const handleRatingMaxChange = (val) => {
  if (!localQuestion.value.options) {
    localQuestion.value.options = {}
  }
  localQuestion.value.options.max = val
  emitChange()
}

const handleShowScoreChange = (val) => {
  if (!localQuestion.value.options) {
    localQuestion.value.options = {}
  }
  localQuestion.value.options.showScore = val
  emitChange()
}

const typeLabel = computed(() => {
  const labels = {
    radio: '单选题',
    checkbox: '多选题',
    select: '下拉题',
    text: '文本题',
    textarea: '多行文本',
    date: '日期题',
    rating: '量表题',
    description: '说明文本'
  }
  return labels[localQuestion.value.type] || '未知题型'
})

const emitChange = () => {
  emit('update', { ...localQuestion.value })
}

const addCondition = () => {
  jumpLogic.value.conditions.push({
    operator: 'eq',
    value: '',
    target: null
  })
}

const removeCondition = (idx) => {
  jumpLogic.value.conditions.splice(idx, 1)
  emitLogicChange()
}

const clearLogic = () => {
  jumpLogic.value = { conditions: [] }
  localQuestion.value.jump_logic = null
  showLogicPanel.value = false
  emitChange()
}

const syncLogicToQuestion = () => {
  const validConditions = jumpLogic.value.conditions.filter(c => c.value && c.target)
  if (validConditions.length > 0) {
    localQuestion.value.jump_logic = {
      conditions: validConditions.map(c => ({ operator: 'eq', value: c.value, target: c.target }))
    }
  } else {
    localQuestion.value.jump_logic = null
  }
  skipWatchJumpLogic = true
  emitChange()
}

const emitLogicChange = () => {
  syncLogicToQuestion()
}

const addOption = () => {
  localQuestion.value.options.push(`选项${localQuestion.value.options.length + 1}`)
  emitChange()
}

const removeOption = (optIndex) => {
  localQuestion.value.options.splice(optIndex, 1)
  emitChange()
}

const handleDelete = () => {
  emit('delete')
}

const moveUp = () => {
  emit('moveUp')
}

const moveDown = () => {
  emit('moveDown')
}
</script>

<style lang="scss" scoped>
.question-item {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  border: 2px solid transparent;
  transition: all 0.2s;

  &.is-edit {
    border-color: #e4e7ed;

    &:hover {
      border-color: #409EFF;
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
    }
  }

  .question-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;

    .question-type-tag {
      display: inline-block;
      padding: 4px 12px;
      background: #ecf5ff;
      color: #409EFF;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .question-actions {
      display: flex;
      gap: 4px;
    }
  }

  .question-content {
    .question-title-row {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;

      .question-index {
        font-weight: 600;
        color: #333;
        margin-right: 8px;
        flex-shrink: 0;
      }

      .question-title-input {
        flex: 1;

        :deep(.el-input__wrapper) {
          box-shadow: none;
          border-bottom: 1px solid #dcdfe6;
          border-radius: 0;
          padding: 0;

          &:hover {
            box-shadow: none;
          }

          &.is-focus {
            box-shadow: none;
            border-bottom-color: #409EFF;
          }
        }
      }

      .question-title-text {
        font-size: 15px;
        color: #333;
        line-height: 1.5;

        .required {
          color: #f56c6c;
          margin-left: 4px;
        }
      }
    }

    .question-options {
      padding-left: 28px;

      .option-item {
        display: flex;
        align-items: center;
        margin-bottom: 12px;

        .option-input {
          flex: 1;
          margin: 0 8px;

          :deep(.el-input__wrapper) {
            box-shadow: none;
            border-bottom: 1px solid #dcdfe6;
            border-radius: 0;
            padding: 0;
          }
        }
      }
    }

    .question-input,
    .question-textarea {
      padding-left: 28px;
    }

    .question-rating {
      padding-left: 28px;

      .rating-preview {
        padding: 8px 0;
      }

      .rating-settings {
        display: flex;
        align-items: center;
        gap: 8px;

        .setting-label {
          color: #666;
          font-size: 14px;
        }
      }
    }

    .question-description {
      padding-left: 28px;

      .description-text {
        padding: 12px 16px;
        background: #f5f7fa;
        border-radius: 6px;
        line-height: 1.6;
        color: #333;
        white-space: pre-wrap;
      }

      .description-edit {
        .description-tip {
          margin-top: 8px;
          color: #909399;
          font-size: 12px;
        }
      }
    }

    .date-settings {
      display: flex;
      align-items: center;
      gap: 8px;

      .setting-label {
        color: #666;
        font-size: 14px;
      }
    }

    .ml-20 {
      margin-left: 20px;
    }
  }

  .question-footer {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .footer-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .logic-count {
        margin-left: 4px;
      }
    }
  }

  .logic-panel {
    margin-top: 16px;
    padding: 16px;
    background: #fdf6ec;
    border-radius: 8px;
    border: 1px solid #faecd8;

    .logic-panel-header {
      margin-bottom: 12px;

      .logic-title {
        font-weight: 600;
        color: #e6a23c;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .logic-desc {
        font-size: 12px;
        color: #909399;
        margin-top: 4px;
      }
    }

    .logic-conditions {
      .logic-condition {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        padding: 8px 12px;
        background: #fff;
        border-radius: 6px;
        border: 1px solid #faecd8;

        .logic-label {
          font-size: 13px;
          color: #666;
          white-space: nowrap;
        }
      }
    }

    .logic-actions {
      display: flex;
      gap: 16px;
      margin-top: 8px;
    }

    .logic-tip {
      margin-top: 12px;
      padding: 8px 12px;
      background: #f0f9eb;
      border-radius: 4px;
      font-size: 12px;
      color: #67c23a;
      display: flex;
      align-items: flex-start;
      gap: 4px;
      line-height: 1.5;

      .el-icon {
        margin-top: 2px;
        flex-shrink: 0;
      }
    }
  }
}
</style>
