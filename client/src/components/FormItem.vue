<template>
  <div class="form-item" :class="{ 'has-error': error }">
    <div class="question-title">
      <span v-if="question.required" class="required">*</span>
      <span class="title-text">{{ question.title }}</span>
    </div>
    <div class="question-content">
      <template v-if="question.type === 'radio'">
        <van-radio-group v-model="currentValue">
          <van-cell-group inset>
            <van-cell
              v-for="option in question.options"
              :key="option"
              :title="option"
              clickable
              @click="selectOption(option)"
            >
              <template #right-icon>
                <van-radio :name="option" :checked="currentValue === option" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>
      </template>

      <template v-else-if="question.type === 'checkbox'">
        <van-checkbox-group v-model="currentValue">
          <van-cell-group inset>
            <van-cell
              v-for="option in question.options"
              :key="option"
              :title="option"
              clickable
              @click="toggleOption(option)"
            >
              <template #right-icon>
                <van-checkbox :name="option" :checked="currentValue.includes(option)" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-checkbox-group>
      </template>

      <template v-else-if="question.type === 'text'">
        <van-field
          v-model="currentValue"
          type="text"
          placeholder="请输入答案"
          :border="false"
          class="text-field"
        />
      </template>

      <template v-else-if="question.type === 'textarea'">
        <van-field
          v-model="currentValue"
          type="textarea"
          placeholder="请输入答案"
          :border="false"
          autosize
          :rows="4"
          class="textarea-field"
        />
      </template>
    </div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  modelValue: {
    type: [String, Array],
    default: ''
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const currentValue = ref(props.question.type === 'checkbox' ? (props.modelValue || []) : (props.modelValue || ''))

watch(
  () => props.modelValue,
  (newVal) => {
    currentValue.value = props.question.type === 'checkbox' ? (newVal || []) : (newVal || '')
  }
)

watch(currentValue, (newVal) => {
  emit('update:modelValue', newVal)
}, { deep: true })

const selectOption = (option) => {
  currentValue.value = option
}

const toggleOption = (option) => {
  const index = currentValue.value.indexOf(option)
  if (index === -1) {
    currentValue.value.push(option)
  } else {
    currentValue.value.splice(index, 1)
  }
}
</script>

<style lang="scss" scoped>
.form-item {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  &.has-error {
    .question-title {
      color: #ee0a24;
    }
  }
}

.question-title {
  font-size: 16px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 16px;
  line-height: 1.5;
}

.required {
  color: #ee0a24;
  margin-right: 4px;
}

.title-text {
  display: inline;
}

.question-content {
  :deep(.van-cell-group--inset) {
    margin: 0;
    border-radius: 8px;
    overflow: hidden;
  }

  :deep(.van-cell) {
    padding: 12px 16px;
  }

  :deep(.van-radio-group),
  :deep(.van-checkbox-group) {
    display: block;
  }
}

.text-field,
.textarea-field {
  :deep(.van-field__control) {
    background-color: #f7f8fa;
    border-radius: 8px;
    padding: 12px 16px;
  }
}

.textarea-field {
  :deep(.van-field__control) {
    min-height: 100px;
  }
}

.error-message {
  font-size: 12px;
  color: #ee0a24;
  margin-top: 8px;
  padding-left: 4px;
}
</style>
