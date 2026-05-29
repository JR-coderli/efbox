import { ref } from 'vue'


function usePageModal(newCallBack, editCallback) {
  const modalRef = ref()
  const uploadModalRef = ref()
  function handleNewClick() {

    modalRef.value?.setModalVisible()

    if (newCallBack) newCallBack()
  }

  function handleEditClick(itemData, isProduct) {

    modalRef.value?.setModalVisible(false, itemData, isProduct)

    if (editCallback) editCallback(itemData)
  }

  function handleUploadFile() {

    uploadModalRef.value?.setModalVisible()

    if (newCallBack) newCallBack()
  }

  return {
    modalRef,
    handleNewClick,
    handleEditClick,
    uploadModalRef,
    handleUploadFile
  }
}

export default usePageModal
