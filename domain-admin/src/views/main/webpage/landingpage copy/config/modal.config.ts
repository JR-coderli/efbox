const modalConfig = {
  pageName: 'landingpage',

  header: {
    newTitle: '新建落地页',
    editTitle: '编辑落地页',
  },
  formItems: [
    {
      type: 'input',
      label: '落地页名称',
      prop: 'landingname',
      placeholder: '请输入落地页名称'
    },
    {
      type: 'input',
      label: '落地页地址',
      prop: 'landing_url',
      placeholder: '请输入落地页地址'
    },
    {
      type: 'input',
      label: '落地页路径',
      prop: 'landing_path',
      placeholder: '请输入落地页路径'
    },
    {
      type: 'select',
      label: '版本',
      prop: 'version',
      placeholder: '请选择落地页版本',
      options: [
        { label: 'v 1.0', value: 'v1.0' },
        { label: 'v 2.0', value: 'v2.0' },
        { label: 'v 3.0', value: 'v3.0' },
        { label: 'v 4.0', value: 'v4.0' },
        { label: 'v 5.0', value: 'v5.0' },
        { label: 'v 6.0', value: 'v6.0' },
        { label: 'v 7.0', value: 'v7.0' },
        { label: 'v 8.0', value: 'v8.0' },
        { label: 'v 9.0', value: 'v9.0' },
        { label: 'v 10.0', value: 'v10.0' }
      ]
    },
    {
      type: 'custom',
      label: '落地页预览图',
      slotName: 'preview_url'
    }
  ]
}

export default modalConfig
