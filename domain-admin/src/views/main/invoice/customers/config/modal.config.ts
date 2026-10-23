const modalConfig = {
  pageName: 'customers',

  labelWidth: '90px', // 弹窗中的输入框左边的文字宽度
  header: {
    newTitle: '新建客户',
    editTitle: '编辑客户',
  },
  formItems: [
    {
      type: 'input',
      label: '客户全称',
      prop: 'full_name',
      placeholder: '请输入客户全称'
    },
    {
      type: 'input',
      label: '客户简称',
      prop: 'short_name',
      placeholder: '请输入客户简称',
      required: true
    },
    {
      type: 'textarea',
      label: '公司地址',
      prop: 'company_address',
      placeholder: '请输入公司地址'
    },
    {
      type: 'textarea',
      label: '接收邮箱',
      prop: 'send_emails',
      autosize: { minRows: 3, maxRows: 6 }, // 最小行数和最大行数
      placeholder: `客户的接收邮箱, 如: 邮箱1@test.com 邮箱2@test.com\n\n(可用换行/空格/逗号分隔多个邮箱)`
    },
    {
      type: 'textarea',
      label: '通知邮箱',
      prop: 'normal_emails',
      initialValue: 'netapop@outlook.com', // 新建客户默认预填原写死的核查邮箱(密送核对)
      autosize: { minRows: 3, maxRows: 6 }, // 最小行数和最大行数
      placeholder: `密送邮箱\n\n(可用换行/空格/逗号分隔多个邮箱)`
    },
    {
      type: 'custom',
      slotName: 'invoice_entity_id',
      label: '开票主体',
      prop: 'invoice_entity_id'
    }
  ]
}

export default modalConfig
