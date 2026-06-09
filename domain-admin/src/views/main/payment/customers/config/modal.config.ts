const modalConfig = {
  pageName: 'payment_customers',
  labelWidth: '90px',
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
      autosize: { minRows: 3, maxRows: 6 },
      placeholder: `邮箱1@test.com\n邮箱2@test.com\n\n(可用换行/空格/逗号分隔多个邮箱)`
    },
    {
      type: 'textarea',
      label: '其他邮箱',
      prop: 'normal_emails',
      autosize: { minRows: 3, maxRows: 6 },
    }
  ]
}

export default modalConfig
