import axios from 'axios'
import { showToast } from 'vant'

const service = axios.create({
  baseURL: '/api',
  timeout: 10000
})

service.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 200) {
      showToast(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  (error) => {
    if (error.response && error.response.status === 429) {
      showToast('提交过于频繁，请稍后再试')
    } else {
      showToast(error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

export default service
