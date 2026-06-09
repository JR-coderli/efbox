const contentConfig = {
  pageName: 'cms_users',
  border: true,
  header: {
    title: '用户列表',
    btnTitle: '新增用户'
  },
  propsList: [
    {
      label: 'ID',
      prop: 'id',
      width: '80'
    },
    {
      label: '用户名',
      prop: 'name',
      width: '150'
    },
    {
      label: '角色',
      prop: 'role_name',
      width: '150'
    },
    {
      type: 'custom',
      label: '头像',
      prop: 'avatar_url',
      slotName: 'avatar_url',
      width: '100'
    },
    {
      type: 'timer',
      label: '创建时间',
      prop: 'createAt',
      width: '180'
    },
    {
      type: 'timer',
      label: '更新时间',
      prop: 'updateAt',
      width: '180'
    },
    {
      type: 'handler',
      label: '操作',
      width: '150'
    }
  ]
}

export default contentConfig
