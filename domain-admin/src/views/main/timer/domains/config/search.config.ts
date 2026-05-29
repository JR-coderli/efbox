const searchConfig = {
  pageName: 'domains',
  formItems: [
    {
      type: 'input',
      prop: 'existing_domain',
      label: '域名',
      placeholder: '请输入域名',
    },
    {
      type: 'input',
      prop: 'landing_page_url',
      label: '落地页url',
      placeholder: '请输入落地页url',
    },











    {
      type: 'select',
      prop: 'is_normal',
      label: '域名状态',
      placeholder: '请选择查询的状态',
      options: [
        { label: '正常', value: 1 },
        { label: '异常', value: 0 }
      ]
    },
    {
      type: 'date-picker',
      prop: 'createAt',
      label: '创建时间',
    }
  ]
}

export default searchConfig