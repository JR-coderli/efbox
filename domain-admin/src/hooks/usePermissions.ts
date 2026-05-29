import useLoginStore from "@/stores/login/login"

function usePermissions(permission: string) {
  const loginStore = useLoginStore()
  const { permissions } = loginStore

  return !!permissions.find(item => item.includes(permission))
}

export default usePermissions