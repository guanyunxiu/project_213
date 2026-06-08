import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, getUserInfo, logout } from '@/api/user'
import { ElMessage } from 'element-plus'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  const isLoggedIn = computed(() => !!token.value)

  const setToken = (newToken) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUserInfo = (info) => {
    userInfo.value = info
    localStorage.setItem('userInfo', JSON.stringify(info))
  }

  const clearAuth = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  const handleLogin = async (loginForm) => {
    try {
      const res = await login(loginForm)
      if (res.code === 200) {
        setToken(res.data.token)
        setUserInfo(res.data.user)
        ElMessage.success('登录成功')
        return true
      }
      return false
    } catch (error) {
      ElMessage.error(error.message || '登录失败')
      return false
    }
  }

  const handleRegister = async (registerForm) => {
    try {
      const res = await register(registerForm)
      if (res.code === 200) {
        setToken(res.data.token)
        setUserInfo(res.data.user)
        ElMessage.success('注册成功，已自动登录')
        return true
      }
      return false
    } catch (error) {
      ElMessage.error(error.message || '注册失败')
      return false
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuth()
      ElMessage.success('已退出登录')
    }
  }

  const fetchUserInfo = async () => {
    try {
      const res = await getUserInfo()
      if (res.code === 200) {
        setUserInfo(res.data.user)
      }
    } catch (error) {
      console.error('Fetch user info error:', error)
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    handleLogin,
    handleRegister,
    handleLogout,
    fetchUserInfo,
    clearAuth
  }
})
