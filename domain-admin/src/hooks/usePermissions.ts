import useLoginStore from "@/stores/login/login"

function usePermissions(permission: string) {
  const loginStore = useLoginStore()
  const { permissions } = loginStore

  return !!permissions.find(item => {
    if (!item.endsWith(permission)) return false

    const prefixIndex = item.length - permission.length
    return prefixIndex === 0 || item[prefixIndex - 1] === ':'
  })
}

export default usePermissions