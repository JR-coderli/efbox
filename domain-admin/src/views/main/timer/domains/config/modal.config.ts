const modalConfig = {
  pageName: 'domains',

  header: {
    newTitle: '新建域名',
    editTitle: '编辑域名',
  },
  formItems: [










    {
      type: 'input',
      label: '落地页地址',
      prop: 'landing_page_url',
      placeholder: '请输入落地页地址',
      initialValue: 'https://',
      required: true,
      rules: [
        {
          pattern: /^https?:\/\/.+/i,
          message: '请输入有效的URL地址（如：https://example.com）',
          trigger: 'blur'
        }
      ]
    },
    {
      type: 'input',
      label: '域名',
      prop: 'existing_domain',
      placeholder: '请输入域名',
      required: true,
      rules: [
        {
          pattern: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
          message: '请输入有效的域名（如：example.com）',
          trigger: 'blur'
        }
      ]
    },
    {
      type: 'custom',
      label: '用途',
      prop: 'purpose',
      slotName: 'purpose',
      required: true
    },










  ]
}

export default modalConfig
