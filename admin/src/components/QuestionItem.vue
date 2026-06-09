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
      <el-switch
        v-model="localQuestion.required"
        active-text="必填"
        inactive-text="选填"
        @change="emitChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Top, Bottom, Delete, Close, Plus } from '@element-plus/icons-vue'

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
  }
})

const emit = defineEmits(['update', 'delete', 'moveUp', 'moveDown'])

const localQuestion = ref({ ...props.question })

const ratingMax = ref(localQuestion.value.options?.max || 5)
const showScore = ref(localQuestion.value.options?.showScore || false)

watch(() => props.question, (newVal) => {
  localQuestion.value = { ...newVal }
  if (newVal.type === 'rating') {
    ratingMax.value = newVal.options?.max || 5
    showScore.value = newVal.options?.showScore || false
  }
}, { deep: true })

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
    justify-content: flex-end;
    align-items: center;
    gap: 20px;
  }
}
</style>
