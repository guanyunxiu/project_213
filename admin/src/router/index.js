import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/questionnaire',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'questionnaire',
        name: 'QuestionnaireList',
        component: () => import('@/views/QuestionnaireList.vue'),
        meta: { title: '问卷列表' }
      },
      {
        path: 'questionnaire/edit/:id',
        name: 'QuestionnaireEdit',
        component: () => import('@/views/QuestionnaireEdit.vue'),
        meta: { title: '编辑问卷' }
      },
      {
        path: 'questionnaire/preview/:id',
        name: 'QuestionnairePreview',
        component: () => import('@/views/QuestionnairePreview.vue'),
        meta: { title: '预览问卷' }
      },
      {
        path: 'questionnaire/stats/:id',
        name: 'QuestionnaireStats',
        component: () => import('@/views/QuestionnaireStats.vue'),
        meta: { title: '统计分析' }
      },
      {
        path: 'questionnaire/responses/:id',
        name: 'ResponseList',
        component: () => import('@/views/ResponseList.vue'),
        meta: { title: '填写记录' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
  } else if (to.path === '/login' && userStore.token) {
    next('/')
  } else {
    next()
  }
})

export default router
