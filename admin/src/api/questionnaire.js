import request from '@/utils/request'

export const getQuestionnaireList = (params) => {
  return request({
    url: '/questionnaire',
    method: 'get',
    params
  })
}

export const getQuestionnaireDetail = (id) => {
  return request({
    url: `/questionnaire/${id}`,
    method: 'get'
  })
}

export const createQuestionnaire = (data) => {
  return request({
    url: '/questionnaire',
    method: 'post',
    data
  })
}

export const updateQuestionnaire = (id, data) => {
  return request({
    url: `/questionnaire/${id}`,
    method: 'put',
    data
  })
}

export const deleteQuestionnaire = (id) => {
  return request({
    url: `/questionnaire/${id}`,
    method: 'delete'
  })
}

export const toggleQuestionnaireStatus = (id, status) => {
  return request({
    url: `/questionnaire/${id}/status`,
    method: 'put',
    data: { status }
  })
}

export const getQuestionnaireStats = (id) => {
  return request({
    url: `/questionnaire/${id}/stats`,
    method: 'get'
  })
}

export const getServerUrl = () => {
  return request({
    url: '/config/server-url',
    method: 'get'
  })
}
