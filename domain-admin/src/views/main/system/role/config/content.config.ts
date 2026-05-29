const contentConfig = {
  pageName: 'role',
  border: true,
  header: {
    title: '角色列表',
    btnTitle: '新增角色'
  },
  propsList: [
    {
      label: 'ID',
      prop: 'id',
      width: '80'
    },
    {
      label: '角色名称',
      prop: 'name',
      width: '150'
    },
    {
      label: '角色描述',
      prop: 'intro',
      width: '250'
    },
    {
      label: '创建时间',
      prop: 'createAt',
      width: '180'
    },
    {
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
