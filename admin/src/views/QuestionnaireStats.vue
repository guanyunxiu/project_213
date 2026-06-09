<template>
  <div class="questionnaire-stats">
    <div class="card mb-20">
      <div class="flex justify-between align-center">
        <div>
          <h2 class="stats-title">{{ questionnaire.title }}</h2>
          <p class="stats-desc">共收到 <el-tag type="primary" size="large">{{ stats.totalResponses }}</el-tag> 份有效填写</p>
        </div>
        <div class="stats-actions">
          <el-button @click="handleBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <el-button type="primary" @click="handleViewResponses">
            <el-icon><List /></el-icon>
            查看记录
          </el-button>
          <el-dropdown @command="handleExport" trigger="click">
            <el-button type="success">
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

    <div v-loading="loading">
      <div v-for="(question, qIndex) in stats.questions" :key="question.id" class="card mb-20">
        <div class="question-header">
          <h3 class="question-title">
            Q{{ qIndex + 1 }}. {{ question.title }}
            <el-tag size="small" :type="getTypeTagType(question.type)">
              {{ getTypeLabel(question.type) }}
            </el-tag>
            <el-tag v-if="question.average !== undefined" type="success" size="small" class="ml-10">
              平均分: {{ question.average }}
            </el-tag>
          </h3>
        </div>

        <div v-if="['radio', 'checkbox', 'select'].includes(question.type)" class="chart-container">
          <div :ref="el => setPieChartRef(el, qIndex)" class="pie-chart"></div>
          <div :ref="el => setBarChartRef(el, qIndex)" class="bar-chart"></div>
        </div>

        <div v-else-if="question.type === 'rating'" class="rating-stats">
          <div class="rating-summary">
            <div class="rating-average">
              <span class="average-value">{{ question.average || 0 }}</span>
              <span class="average-label">平均分</span>
            </div>
            <div :ref="el => setBarChartRef(el, qIndex)" class="rating-chart"></div>
          </div>
          <div class="rating-detail">
            <div v-for="opt in question.options" :key="opt.rating" class="rating-item">
              <span class="rating-label">{{ opt.rating }} 分</span>
              <div class="rating-bar">
                <div class="rating-bar-inner" :style="{ width: opt.percentage + '%' }"></div>
              </div>
              <span class="rating-count">{{ opt.count }} 人 ({{ opt.percentage }}%)</span>
            </div>
          </div>
        </div>

        <div v-else-if="question.type === 'date'" class="date-stats">
          <div :ref="el => setBarChartRef(el, qIndex)" class="date-chart"></div>
          <el-table :data="question.dateStats || []" stripe size="small">
            <el-table-column prop="date" label="日期" width="150" />
            <el-table-column prop="count" label="选择人数" width="120" />
            <el-table-column prop="percentage" label="占比" width="120">
              <template #default="{ row }">{{ row.percentage }}%</template>
            </el-table-column>
          </el-table>
        </div>

        <div v-else-if="question.type === 'description'" class="description-stats">
          <el-empty description="说明文本无需统计" :image-size="80" />
        </div>

        <div v-else class="text-responses">
          <h4 class="responses-title">回答列表</h4>
          <div v-if="question.topWords && question.topWords.length > 0" class="word-cloud">
            <h5 class="word-title">高频词云</h5>
            <div class="word-tags">
              <el-tag 
                v-for="word in question.topWords" 
                :key="word.word"
                :type="getWordTagType(word.count)"
                size="small"
                class="word-tag"
              >
                {{ word.word }} ({{ word.count }})
              </el-tag>
            </div>
          </div>
          <el-table :data="question.responses || []" stripe>
            <el-table-column type="index" label="序号" width="80" />
            <el-table-column prop="value" label="回答内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="填写时间" width="180" />
          </el-table>
          <el-empty v-if="!question.responses || question.responses.length === 0" description="暂无回答" :image-size="80" />
        </div>
      </div>

      <el-empty v-if="!stats.questions || stats.questions.length === 0" description="暂无统计数据" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, List, Download, ArrowDown, Document, Tickets } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getQuestionnaireStats, getQuestionnaireDetail } from '@/api/questionnaire'
import { exportResponses } from '@/api/response'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const questionnaire = reactive({
  id: '',
  title: ''
})

const stats = reactive({
  totalResponses: 0,
  questions: []
})

const pieChartRefs = ref([])
const barChartRefs = ref([])
const pieCharts = ref([])
const barCharts = ref([])

const setPieChartRef = (el, index) => {
  if (el) {
    pieChartRefs.value[index] = el
  }
}

const setBarChartRef = (el, index) => {
  if (el) {
    barChartRefs.value[index] = el
  }
}

const getTypeLabel = (type) => {
  const labels = {
    radio: '单选',
    checkbox: '多选',
    select: '下拉',
    text: '文本题',
    textarea: '多行文本',
    date: '日期',
    rating: '量表',
    description: '说明文本'
  }
  return labels[type] || type
}

const getTypeTagType = (type) => {
  const types = {
    radio: '',
    checkbox: 'warning',
    select: 'info',
    text: 'success',
    textarea: 'danger',
    date: '',
    rating: 'warning',
    description: 'info'
  }
  return types[type] || ''
}

const getWordTagType = (count) => {
  if (count >= 10) return 'danger'
  if (count >= 5) return 'warning'
  if (count >= 3) return 'primary'
  return 'info'
}

const handleExport = async (format) => {
  try {
    const id = route.params.id
    const response = await exportResponses(id, format)
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${questionnaire.title}_填写记录.${format}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('Export error:', error)
    ElMessage.error('导出失败')
  }
}

const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']

const initPieChart = (index, data) => {
  if (!pieChartRefs.value[index]) return

  if (pieCharts.value[index]) {
    pieCharts.value[index].dispose()
  }

  const chart = echarts.init(pieChartRefs.value[index])
  pieCharts.value[index] = chart

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data.map((item, i) => ({
          value: item.count,
          name: item.name,
          itemStyle: { color: colors[i % colors.length] }
        }))
      }
    ]
  }

  chart.setOption(option)
}

const initBarChart = (index, data) => {
  if (!barChartRefs.value[index]) return

  if (barCharts.value[index]) {
    barCharts.value[index].dispose()
  }

  const chart = echarts.init(barChartRefs.value[index])
  barCharts.value[index] = chart

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLabel: {
        interval: 0,
        rotate: 0
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        type: 'bar',
        data: data.map((item, i) => ({
          value: item.count,
          itemStyle: {
            color: colors[i % colors.length],
            borderRadius: [4, 4, 0, 0]
          }
        })),
        barWidth: '50%',
        label: {
          show: true,
          position: 'top'
        }
      }
    ]
  }

  chart.setOption(option)
}

const fetchStats = async () => {
  const id = route.params.id
  if (!id) return

  loading.value = true
  try {
    const [detailRes, statsRes] = await Promise.all([
      getQuestionnaireDetail(id),
      getQuestionnaireStats(id)
    ])

    if (detailRes.code === 200) {
      questionnaire.id = detailRes.data.questionnaire.id
      questionnaire.title = detailRes.data.questionnaire.title
    }

    if (statsRes.code === 200) {
      stats.totalResponses = statsRes.data.totalResponses || 0
      stats.questions = statsRes.data.stats?.map(s => ({
        id: s.questionId,
        title: s.questionTitle,
        type: s.type,
        options: s.options,
        average: s.average,
        validCount: s.validCount,
        dateStats: s.dateStats,
        topWords: s.topWords,
        responses: s.answers?.map((a, idx) => ({
          value: a,
          createdAt: '-'
        })) || []
      })) || []

      await nextTick()

      stats.questions.forEach((question, index) => {
        if (['radio', 'checkbox', 'select'].includes(question.type)) {
          const chartData = question.options?.map(opt => ({
            name: opt.option,
            count: opt.count || 0
          })) || []

          initPieChart(index, chartData)
          initBarChart(index, chartData)
        } else if (question.type === 'rating') {
          const chartData = question.options?.map(opt => ({
            name: `${opt.rating}分`,
            count: opt.count || 0
          })) || []

          initBarChart(index, chartData)
        } else if (question.type === 'date') {
          const chartData = question.dateStats?.map(d => ({
            name: d.date,
            count: d.count || 0
          })) || []

          initBarChart(index, chartData)
        }
      })
    }
  } catch (error) {
    console.error('Fetch stats error:', error)
  } finally {
    loading.value = false
  }
}

const handleResize = () => {
  pieCharts.value.forEach(chart => chart?.resize())
  barCharts.value.forEach(chart => chart?.resize())
}

const handleBack = () => {
  router.push('/questionnaire')
}

const handleViewResponses = () => {
  router.push(`/questionnaire/responses/${questionnaire.id}`)
}

onMounted(() => {
  fetchStats()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  pieCharts.value.forEach(chart => chart?.dispose())
  barCharts.value.forEach(chart => chart?.dispose())
})
</script>

<style lang="scss" scoped>
.questionnaire-stats {
  .stats-title {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #333;
  }

  .stats-desc {
    margin: 0;
    color: #666;
  }

  .question-header {
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;

    .question-title {
      margin: 0;
      font-size: 16px;
      color: #333;

      .el-tag {
        margin-left: 12px;
      }
    }
  }

  .chart-container {
    display: flex;
    gap: 20px;

    .pie-chart,
    .bar-chart {
      flex: 1;
      height: 300px;
    }
  }

  .text-responses {
    .responses-title {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #666;
    }

    .word-cloud {
      margin-bottom: 20px;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 8px;

      .word-title {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }

      .word-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .word-tag {
          cursor: default;
        }
      }
    }
  }

  .rating-stats {
    .rating-summary {
      display: flex;
      align-items: center;
      gap: 40px;
      margin-bottom: 24px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: #fff;

      .rating-average {
        text-align: center;

        .average-value {
          display: block;
          font-size: 48px;
          font-weight: 700;
          line-height: 1;
        }

        .average-label {
          display: block;
          font-size: 14px;
          margin-top: 8px;
          opacity: 0.9;
        }
      }

      .rating-chart {
        flex: 1;
        height: 120px;
      }
    }

    .rating-detail {
      .rating-item {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        gap: 16px;

        .rating-label {
          width: 60px;
          flex-shrink: 0;
          font-weight: 500;
          color: #333;
        }

        .rating-bar {
          flex: 1;
          height: 20px;
          background: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;

          .rating-bar-inner {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transition: width 0.3s ease;
          }
        }

        .rating-count {
          width: 120px;
          flex-shrink: 0;
          text-align: right;
          color: #666;
          font-size: 13px;
        }
      }
    }
  }

  .date-stats {
    .date-chart {
      height: 250px;
      margin-bottom: 20px;
    }
  }

  .description-stats {
    padding: 40px 0;
  }

  .ml-10 {
    margin-left: 10px;
  }
}
</style>
