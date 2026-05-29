const modalConfig = {
  pageName: 'role',
  headerTitle: {
    new: '新建角色',
    edit: '编辑角色'
  },
  formItems: [
    {
      prop: 'name',
      label: '角色名称',
      type: 'input',
      placeholder: '请输入角色名称',
      initialValue: '',
      rules: [
        { required: true, message: '请输入角色名称', trigger: 'blur' },
        { min: 2, max: 20, message: '角色名称长度为2-20个字符', trigger: 'blur' }
      ]
    },
    {
      prop: 'intro',
      label: '角色描述',
      type: 'textarea',
      placeholder: '请输入角色描述（选填）',
      initialValue: '',
      rules: []
    }
  ]
}

export default modalConfig
