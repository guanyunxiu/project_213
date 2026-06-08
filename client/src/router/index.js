import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/fill/1'
  },
  {
    path: '/fill/:id',
    name: 'FillQuestionnaire',
    component: () => import('../views/FillQuestionnaire.vue')
  },
  {
    path: '/success',
    name: 'SubmitSuccess',
    component: () => import('../views/SubmitSuccess.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
