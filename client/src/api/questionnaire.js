import request from '../utils/request'

export const verifyQuestionnaireAccess = (id, data) => {
  return request({
    url: `/questionnaire/public/${id}/verify`,
    method: 'post',
    data
  })
}

export const getPublicQuestionnaire = (id, params = {}) => {
  return request({
    url: `/questionnaire/public/${id}`,
    method: 'get',
    params
  })
}

export const submitQuestionnaire = (id, data) => {
  return request({
    url: `/response/${id}`,
    method: 'post',
    data
  })
}
