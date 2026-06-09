import request from '@/utils/request'

export const getResponseList = (id, params) => {
  return request({
    url: `/response/questionnaire/${id}`,
    method: 'get',
    params
  })
}

export const getResponseStats = (id) => {
  return request({
    url: `/response/questionnaire/${id}/stats`,
    method: 'get'
  })
}

export const exportResponses = (id, format = 'xlsx') => {
  return request({
    url: `/response/questionnaire/${id}/export`,
    method: 'get',
    params: { format },
    responseType: 'blob'
  })
}

export const submitResponse = (id, data) => {
  return request({
    url: `/response/${id}`,
    method: 'post',
    data
  })
}
