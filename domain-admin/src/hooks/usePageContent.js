import { ref } from 'vue' 
import { formatUTC2 } from '@/utils/format'

function usePageContent() {

  const contentRef = ref(null)

  const contentRefs = ref(null)

  let createAt = []


  function handleQueryClick(formData) {


    if (formData.createAt.length > 0) {
      createAt[0] = formatUTC2(formData.createAt[0])
      createAt[1] = formatUTC2(formData.createAt[1])
      formData.createAt = createAt
    }
  

    if (contentRefs.value) {
      contentRefs.value?.forEach(ref => ref.fetchPageListData(formData, true)) // 调用子组件的方法发送网络请求的函数
    } else {

      contentRef.value?.fetchPageListData(formData, true) // 调用子组件的方法发送网络请求的函数
    }
  }

  function handleResetClick() {

    if (contentRefs.value) {
      contentRefs.value?.forEach(ref => ref.fetchPageListData(null, true)) // 调用子组件的方法发送网络请求的函数
    } else {

      contentRef.value?.fetchPageListData(null, true) // 调用子组件的方法发送网络请求的函数
    }
  }

  return {
    contentRef,
    contentRefs,
    handleQueryClick,
    handleResetClick
  }
}

export default usePageContent