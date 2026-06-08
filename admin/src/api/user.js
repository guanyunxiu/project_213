import request from '@/utils/request'

export const login = (data) => {
  return request({
    url: '/user/login',
    method: 'post',
    data
  })
}

export const register = (data) => {
  return request({
    url: '/user/register',
    method: 'post',
    data
  })
}

export const getUserInfo = () => {
  return request({
    url: '/user/info',
    method: 'get'
  })
}

export const logout = () => {
  return request({
    url: '/user/logout',
    method: 'post'
  })
}
