
const DEFAULT_AVATAR = 'https://api.dicebear.com/9.x/avataaars/svg?seed='

const modalConfig = {
  pageName: 'cms_users',
  labelWidth: '90px',
  header: {
    newTitle: '新建用户',
    editTitle: '编辑用户'
  },
  formItems: [
    {
      type: 'input',
      label: '用户名',
      prop: 'name',
      placeholder: '请输入用户名'
    },
    {
      type: 'input',
      label: '密码',
      prop: 'password',
      placeholder: '请输入密码',
      initialValue: ''
    },
    {
      type: 'select',
      label: '角色',
      prop: 'role_id',
      placeholder: '请选择角色',
      options: []
    },
    {
      type: 'input',
      label: '头像',
      prop: 'avatar_url',
      placeholder: '请上传头像',
      initialValue: ''
    }
  ],
  DEFAULT_AVATAR
}

export default modalConfig
