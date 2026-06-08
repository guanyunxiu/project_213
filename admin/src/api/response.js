import request from '@/utils/request'

export const getResponseList = (questionnaireId, params) => {
  return request({
    url: `/response/${questionnaireId}`,
    method: 'get',
    params
  })
}

export const exportResponses = (questionnaireId) => {
  return request({
    url: `/response/${questionnaireId}/export`,
    method: 'get',
    responseType: 'blob'
  })
}

export const deleteResponse = (id) => {
  return request({
    url: `/response/${id}`,
    method: 'delete'
  })
}
