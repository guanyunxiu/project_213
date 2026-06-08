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
        </div>
      </div>
    </div>

    <div v-loading="loading">
      <div v-for="(question, qIndex) in stats.questions" :key="question.id" class="card mb-20">
        <div class="question-header">
          <h3 class="question-title">
            Q{{ qIndex + 1 }}. {{ question.title }}
            <el-tag size="small" :type="question.type === 'radio' ? '' : 'warning'">
              {{ question.type === 'radio' ? '单选' : question.type === 'checkbox' ? '多选' : '文本题' }}
            </el-tag>
          </h3>
        </div>

        <div v-if="question.type === 'radio' || question.type === 'checkbox'" class="chart-container">
          <div :ref="el => setPieChartRef(el, qIndex)" class="pie-chart"></div>
          <div :ref="el => setBarChartRef(el, qIndex)" class="bar-chart"></div>
        </div>

        <div v-else class="text-responses">
          <h4 class="responses-title">回答列表</h4>
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
import { ArrowLeft, List } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getQuestionnaireStats, getQuestionnaireDetail } from '@/api/questionnaire'

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
        responses: s.answers?.map((a, idx) => ({
          value: a,
          createdAt: '-'
        })) || []
      })) || []

      await nextTick()

      stats.questions.forEach((question, index) => {
        if (question.type === 'radio' || question.type === 'checkbox') {
          const chartData = question.options?.map(opt => ({
            name: opt.option,
            count: opt.count || 0
          })) || []

          initPieChart(index, chartData)
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
  }
}
</style>
