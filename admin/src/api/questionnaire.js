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

export const getQuestionnaireSettings = async (id) => {
  const res = await request({
    url: `/questionnaire/${id}/settings`,
    method: 'get'
  })
  
  if (res.code === 200 && res.data) {
    const data = res.data
    res.data = {
      ...data,
      publishTime: data.publish_at,
      expireTime: data.expire_at,
      accessType: data.access_type,
      maxSubmissions: data.max_responses_per_user,
      ipLimit: data.ip_limit === 1 || data.ip_limit === true
    }
  }
  
  return res
}

export const updateQuestionnaireSettings = (id, data) => {
  const backendData = {
    publish_at: data.publishTime || null,
    expire_at: data.expireTime || null,
    access_type: data.accessType || 'public',
    password: data.password || '',
    max_responses_per_user: data.maxSubmissions || 0,
    ip_limit: data.ipLimit ? 1 : 0,
    status: data.status
  }
  
  return request({
    url: `/questionnaire/${id}/settings`,
    method: 'put',
    data: backendData
  })
}

export const getPublicTemplates = (params) => {
  return request({
    url: '/template/public',
    method: 'get',
    params
  })
}

export const getMyTemplates = (params) => {
  return request({
    url: '/template/my',
    method: 'get',
    params
  })
}

export const getTemplateDetail = (id) => {
  return request({
    url: `/template/${id}`,
    method: 'get'
  })
}

export const createTemplate = (data) => {
  return request({
    url: '/template',
    method: 'post',
    data
  })
}

export const applyTemplate = (id, data) => {
  return request({
    url: `/template/apply/${id}`,
    method: 'post',
    data
  })
}

export const saveQuestionnaireAsTemplate = (id, data) => {
  return request({
    url: `/template/questionnaire/${id}`,
    method: 'post',
    data
  })
}

export const updateTemplate = (id, data) => {
  return request({
    url: `/template/${id}`,
    method: 'put',
    data
  })
}

export const deleteTemplate = (id) => {
  return request({
    url: `/template/${id}`,
    method: 'delete'
  })
}
