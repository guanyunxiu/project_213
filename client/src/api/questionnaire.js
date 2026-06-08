import request from '../utils/request'

export const getPublicQuestionnaire = (id) => {
  return request({
    url: `/questionnaire/public/${id}`,
    method: 'get'
  })
}

export const submitQuestionnaire = (id, data) => {
  return request({
    url: `/response/${id}`,
    method: 'post',
    data
  })
}
