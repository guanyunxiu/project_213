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

      <div class="question-options" v-if="localQuestion.type === 'radio' || localQuestion.type === 'checkbox'">
        <div
          v-for="(option, optIndex) in localQuestion.options"
          :key="optIndex"
          class="option-item"
        >
          <el-radio v-if="!isEdit" :label="option" :model-value="null" disabled>
            {{ option }}
          </el-radio>
          <el-checkbox v-else-if="!isEdit" :label="option" :model-value="[]" disabled>
            {{ option }}
          </el-checkbox>
          <template v-else>
            <el-radio v-if="localQuestion.type === 'radio'" disabled :label="option" />
            <el-checkbox v-else disabled :label="option" />
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

watch(() => props.question, (newVal) => {
  localQuestion.value = { ...newVal }
}, { deep: true })

const typeLabel = computed(() => {
  const labels = {
    radio: '单选题',
    checkbox: '多选题',
    text: '文本题',
    textarea: '多行文本'
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
  }

  .question-footer {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
