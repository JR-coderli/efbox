const searchConfig = {
  pageName: 'landingpage',
  formItems: [
    {
      type: 'input',
      prop: 'landingname',
      label: '落地页名称',
      placeholder: '请输入落地页名称',

    },
    {
      type: 'input',
      prop: 'landing_url',
      label: '落地页url',
      placeholder: '请输入落地页url',
    },
    {
      type: 'input',
      prop: 'landing_path',
      label: '落地页路径',
      placeholder: '请输入落地页路径',
    },
    {
      type: 'input',
      prop: 'version',
      label: '版本',
      placeholder: '请输入落地页版本',
    },
    {
      type: 'date-picker',
      prop: 'createAt',
      label: '创建时间',
    },











  ]
}

export default searchConfig