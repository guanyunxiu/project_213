<template>
  <div class="question-type-panel">
    <h3 class="panel-title">题型选择</h3>
    <div class="type-list">
      <div
        v-for="type in questionTypes"
        :key="type.value"
        class="type-item"
        draggable="true"
        @dragstart="handleDragStart($event, type.value)"
      >
        <el-icon class="type-icon"><component :is="type.icon" /></el-icon>
        <span>{{ type.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { CreditCard, Select, Edit, ChatLineSquare, List, Calendar, Star, Document } from '@element-plus/icons-vue'

const emit = defineEmits(['addQuestion'])

const questionTypes = [
  { label: '单选题', value: 'radio', icon: CreditCard, category: 'choice' },
  { label: '多选题', value: 'checkbox', icon: Select, category: 'choice' },
  { label: '下拉题', value: 'select', icon: List, category: 'choice' },
  { label: '文本题', value: 'text', icon: Edit, category: 'input' },
  { label: '多行文本', value: 'textarea', icon: ChatLineSquare, category: 'input' },
  { label: '日期题', value: 'date', icon: Calendar, category: 'input' },
  { label: '量表题', value: 'rating', icon: Star, category: 'input' },
  { label: '说明文本', value: 'description', icon: Document, category: 'other' }
]

const handleDragStart = (event, type) => {
  event.dataTransfer.setData('questionType', type)
  event.dataTransfer.effectAllowed = 'copy'
}
</script>

<style lang="scss" scoped>
.question-type-panel {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  height: 100%;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

  .panel-title {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
  }

  .type-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .type-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #f5f7fa;
    border-radius: 6px;
    cursor: grab;
    transition: all 0.2s;

    &:hover {
      background: #ecf5ff;
      color: #409EFF;
      transform: translateX(4px);
    }

    &:active {
      cursor: grabbing;
    }

    .type-icon {
      margin-right: 12px;
      font-size: 20px;
    }

    span {
      font-size: 14px;
    }
  }
}
</style>
