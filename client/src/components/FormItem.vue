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

      <template v-else-if="question.type === 'select'">
        <van-field
          v-model="currentValue"
          is-link
          readonly
          placeholder="请选择"
          :border="false"
          class="select-field"
          @click="showPicker = true"
        />
        <van-popup v-model:show="showPicker" position="bottom">
          <van-picker
            :columns="question.options"
            @confirm="onPickerConfirm"
            @cancel="showPicker = false"
          />
        </van-popup>
      </template>

      <template v-else-if="question.type === 'date'">
        <van-field
          v-model="currentValue"
          is-link
          readonly
          placeholder="请选择日期"
          :border="false"
          class="date-field"
          @click="showDatePicker = true"
        />
        <van-calendar
          v-model:show="showDatePicker"
          :type="question.dateType === 'daterange' ? 'range' : 'single'"
          @confirm="onDateConfirm"
        />
      </template>

      <template v-else-if="question.type === 'rating'">
        <div class="rating-field">
          <van-rate
            v-model="currentValue"
            :max="question.options?.max || 5"
            size="32px"
            :allow-half="false"
          />
          <span v-if="question.options?.showScore && currentValue" class="rating-score">
            {{ currentValue }} 分
          </span>
        </div>
      </template>

      <template v-else-if="question.type === 'description'">
        <div class="description-field">
          {{ question.title }}
        </div>
      </template>
    </div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  modelValue: {
    type: [String, Array, Number],
    default: ''
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'jump'])

const showPicker = ref(false)
const showDatePicker = ref(false)

const getDefaultValue = () => {
  const type = props.question.type
  if (type === 'checkbox') return props.modelValue || []
  if (type === 'rating') return props.modelValue || null
  return props.modelValue || ''
}

const currentValue = ref(getDefaultValue())

const formattedDate = computed(() => {
  if (!currentValue.value) return ''
  if (Array.isArray(currentValue.value)) {
    return currentValue.value.join(' 至 ')
  }
  return currentValue.value
})

watch(
  () => props.modelValue,
  (newVal) => {
    const type = props.question.type
    if (type === 'checkbox') {
      currentValue.value = newVal || []
    } else if (type === 'rating') {
      currentValue.value = newVal || null
    } else {
      currentValue.value = newVal || ''
    }
  }
)

watch(currentValue, (newVal) => {
  emit('update:modelValue', newVal)
  checkJumpLogic(newVal)
}, { deep: true })

const checkJumpLogic = (val) => {
  if (!props.question.jump_logic) return
  
  const jump = props.question.jump_logic
  let targetQuestionId = null
  
  if (jump.conditions && Array.isArray(jump.conditions)) {
    for (const condition of jump.conditions) {
      let match = false
      const answerVal = Array.isArray(val) ? val : [val]
      
      if (condition.operator === 'eq') {
        match = answerVal.includes(condition.value)
      } else if (condition.operator === 'ne') {
        match = !answerVal.includes(condition.value)
      } else if (condition.operator === 'gt') {
        match = parseFloat(val) > parseFloat(condition.value)
      } else if (condition.operator === 'lt') {
        match = parseFloat(val) < parseFloat(condition.value)
      }
      
      if (match) {
        targetQuestionId = condition.target
        break
      }
    }
  }
  
  if (targetQuestionId !== null) {
    emit('jump', targetQuestionId)
  }
}

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

const onPickerConfirm = ({ selectedOptions }) => {
  currentValue.value = selectedOptions[0]
  showPicker.value = false
}

const onDateConfirm = (value) => {
  if (Array.isArray(value)) {
    currentValue.value = value.map(v => formatDate(v))
  } else {
    currentValue.value = formatDate(value)
  }
  showDatePicker.value = false
}

const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

.select-field,
.date-field {
  :deep(.van-field__control) {
    background-color: #f7f8fa;
    border-radius: 8px;
    padding: 12px 16px;
  }
}

.rating-field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;

  .rating-score {
    font-size: 14px;
    color: #ff976a;
    font-weight: 500;
  }
}

.description-field {
  padding: 16px;
  background-color: #f0f9ff;
  border-radius: 8px;
  color: #323233;
  line-height: 1.6;
  font-size: 14px;
}

.no-required {
  .required {
    display: none;
  }
}

.error-message {
  font-size: 12px;
  color: #ee0a24;
  margin-top: 8px;
  padding-left: 4px;
}
</style>
